import React, { useState, useEffect, useId } from 'react';
import {
  ArrowLeftRight,
  Search,
  ScanLine,
  X,
  Barcode,
  Check,
  CheckCircle2,
  FileText,
  Sparkles,
  Printer,
  Receipt,
  Banknote,
  QrCode,
  Loader2,
  Clock,
  AlertTriangle,
  Scale,
  ShieldCheck,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { returnApi } from '../api/returnApi';
import { invoiceApi } from '../api/invoiceApi';
import { rulesApi } from '../api/rulesApi';
import { playScannerBeep, generateBarcodeSvg } from '../utils/barcodeGenerator';
import { decodeBarcodeFromImage, getImageFileFromClipboard } from '../utils/barcodeImageDecoder';
import BarcodeCameraModal from './BarcodeCameraModal';
import ReceiptModal from './ReceiptModal';
import './ReturnProcessing.css';

/**
 * Component Tiếp nhận trả sách rải rác & Tự động tính tiền phạt trễ hạn theo FineRules (Story US-10).
 * Tích hợp gọi API Backend POST /api/returns/process-item và GET /api/returns/lookup.
 *
 * @param {object} props
 * @param {(result: object) => void} props.onReturnSuccess Callback khi hoàn tất trả sách thành công
 * @param {(msg: string) => void} props.showToast Hàm hiển thị toast thông báo
 * @param {object} props.user Thông tin người dùng/thủ thư đang đăng nhập
 */
export default function ReturnProcessing({ onReturnSuccess, showToast, user }) {
  const returnInputId = useId();

  // State tìm kiếm & tải dữ liệu
  const [returnQuery, setReturnQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State dữ liệu sách đang được tra cứu để trả
  const [lookupData, setLookupData] = useState(null);

  // Modal máy quét Barcode camera & Modal xem mã vạch Barcode cuốn sách
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [barcodePreviewItem, setBarcodePreviewItem] = useState(null);

  // Dữ liệu quy định hệ thống nạp từ rulesApi / LocalStorage để flex các tỷ lệ và text theo setting
  const [systemRules, setSystemRules] = useState(rulesApi.getDefaultRules());

  useEffect(() => {
    rulesApi.getSystemRules().then((rules) => {
      if (rules) setSystemRules(rules);
    });
  }, []);

  // Tình trạng vật lý thực tế khi kiểm tra sách (Quy tắc 10.3 - Tùy chọn)
  // Quản lý tình trạng vật lý cho từng cuốn sách độc lập: { [barcode]: { isDamaged: boolean, damageLevel: 1 | 2 | 3 } }
  // damageLevel: 1 = Nhẹ, 2 = Vừa, 3 = Nặng
  const [bookConditions, setBookConditions] = useState({});
  const [showOverdueFormula, setShowOverdueFormula] = useState(false);

  // Miễn giảm tiền phạt
  const [waiverDiscountPercent, setWaiverDiscountPercent] = useState(0);
  const [waiverReason, setWaiverReason] = useState('');
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  // Modal thu tiền phạt
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'

  // Modal hiển thị & in ấn hóa đơn thu tiền chuẩn K80 / A5 (Story LOLRA-19)
  const [paidInvoiceData, setPaidInvoiceData] = useState(null);
  const [showPaidReceiptModal, setShowPaidReceiptModal] = useState(false);

  // Danh sách toàn bộ các cuốn sách trong phiếu mượn
  const bookList = React.useMemo(() => {
    if (!lookupData) return [];
    if (Array.isArray(lookupData.items) && lookupData.items.length > 0) {
      return lookupData.items;
    }
    return [
      {
        detailId: lookupData.detailId,
        copyId: lookupData.copyId,
        barcode: lookupData.barcode,
        bookTitle: lookupData.bookTitle,
        author: lookupData.author,
        basePrice: lookupData.basePrice || 50000,
        isReturned: lookupData.currentItemStatus !== 'Borrowed'
      }
    ];
  }, [lookupData]);

  // Các cuốn sách đang cần hoàn trả (chưa trả)
  const activeBooksToReturn = React.useMemo(() => {
    return bookList.filter((b) => !b.isReturned);
  }, [bookList]);

  // Danh sách barcode các cuốn sách được thủ thư chọn để xử lý trả trong đợt này (Hỗ trợ trả chọn lọc / trả rải rác)
  const [selectedReturnBarcodes, setSelectedReturnBarcodes] = useState([]);

  // Khi có dữ liệu tra cứu mới, tự động khởi tạo tình trạng vật lý cho từng cuốn & reset miễn giảm
  useEffect(() => {
    if (lookupData && bookList.length > 0) {
      const initConds = {};
      bookList.forEach((b) => {
        initConds[b.barcode] = {
          status: 'good', // 'good' | 'damaged' | 'lost'
          damageLevel: 1 // Mặc định mức 1 (Nhẹ 20%) khi chuyển sang hư hỏng
        };
      });
      setBookConditions(initConds);
      setWaiverDiscountPercent(0);
      setWaiverReason('');
      setShowOverdueFormula(false);

      // Tự động chọn cuốn cần trả:
      const unreturned = bookList.filter((b) => !b.isReturned);
      const cleanQuery = (returnQuery || '').trim().toUpperCase();
      const singleMatch = unreturned.find((b) => b.barcode?.toUpperCase() === cleanQuery);

      if (singleMatch) {
        // Nếu quét hoặc tra cứu trúng đích danh barcode của 1 cuốn sách -> chỉ chọn trả cuốn đó
        setSelectedReturnBarcodes([singleMatch.barcode]);
      } else {
        // Mặc định (hoặc tìm theo mã phiếu mượn PM-xxxx) -> chọn toàn bộ các cuốn chưa trả
        setSelectedReturnBarcodes(unreturned.map((b) => b.barcode));
      }
    }
  }, [lookupData, bookList]);

  // Helper toggle chọn / bỏ chọn 1 cuốn sách
  const handleToggleSelectBook = (barcode) => {
    setSelectedReturnBarcodes((prev) => {
      if (prev.includes(barcode)) {
        return prev.filter((code) => code !== barcode);
      } else {
        return [...prev, barcode];
      }
    });
  };

  // Helper chọn tất cả các cuốn sách chưa trả
  const handleSelectAll = () => {
    setSelectedReturnBarcodes(activeBooksToReturn.map((b) => b.barcode));
  };

  // Helper bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedReturnBarcodes([]);
  };

  // Các cuốn sách THỰC SỰ được chọn để xử lý hoàn trả trong giao dịch hiện tại
  const booksToActuallyReturn = React.useMemo(() => {
    return activeBooksToReturn.filter((b) => selectedReturnBarcodes.includes(b.barcode));
  }, [activeBooksToReturn, selectedReturnBarcodes]);

  // Helper đọc và cập nhật tình trạng cho một cuốn sách cụ thể
  const getBookCondition = (barcode) => {
    return bookConditions[barcode] || { status: 'good', damageLevel: 1 };
  };

  const handleUpdateBookCondition = (barcode, status, damageLevel) => {
    setBookConditions((prev) => {
      const current = prev[barcode] || { status: 'good', damageLevel: 1 };
      return {
        ...prev,
        [barcode]: {
          status: status !== undefined ? status : current.status,
          damageLevel: damageLevel !== undefined ? damageLevel : (current.damageLevel || 1)
        }
      };
    });
  };

  // 1. Dữ liệu cơ sở từ Backend và bảng FineRules
  const finePerDay = lookupData?.finePerDay || 5000;
  const overdueDays = lookupData?.overdueDays ?? 0;
  const isOverdue = overdueDays > 0;
  const isOnTime = overdueDays === 0;

  // Tỷ lệ phạt rách/hỏng nhẹ, vừa, nặng và đền bù mất sách lấy động theo Cài đặt quy định (Flex theo Setting)
  const damageLightPct = Number(lookupData?.damageFeePercent ?? systemRules.damagePenaltyPercent) || 20;
  const damageMedPct = Number(lookupData?.damageMediumPercent ?? systemRules.damageMediumPercent) || 40;
  const damageSeverePct = Number(lookupData?.damageSeverePercent ?? systemRules.damageSeverePercent) || 110;
  const lostPct = Number(lookupData?.compensationBasePercent ?? systemRules.compensationBasePercent) || 110;
  const surchargePct = Math.max(0, lostPct - 100);

  // 2. Tính toán tiền phạt trễ hạn và bồi thường trên các cuốn sách ĐƯỢC CHỌN TRẢ ĐỢT NÀY
  let totalOverdueFine = 0;
  let rawOverdueFineSum = 0;
  let totalDamageFee = 0;
  let totalLostFee = 0;
  let isAnyFineCapped = false;

  booksToActuallyReturn.forEach((b) => {
    const bPrice = b.basePrice || 50000;
    if (isOverdue) {
      const rawFine = overdueDays * finePerDay;
      rawOverdueFineSum += rawFine;
      if (rawFine > bPrice) isAnyFineCapped = true;
      const bFine = Math.min(rawFine, bPrice);
      totalOverdueFine += Math.round(bFine / 1000) * 1000;
    }

    const cond = getBookCondition(b.barcode);
    if (cond.status === 'damaged') {
      if (cond.damageLevel === 1) {
        // Nhẹ: Tỷ lệ phạt nhẹ cấu hình
        totalDamageFee += Math.round((bPrice * (damageLightPct / 100)) / 1000) * 1000;
      } else if (cond.damageLevel === 2) {
        // Vừa: Tỷ lệ phạt vừa cấu hình
        totalDamageFee += Math.round((bPrice * (damageMedPct / 100)) / 1000) * 1000;
      } else if (cond.damageLevel === 3) {
        // Nặng: Tỷ lệ phạt nặng cấu hình
        totalDamageFee += Math.round((bPrice * (damageSeverePct / 100)) / 1000) * 1000;
      }
    } else if (cond.status === 'lost') {
      // Thất lạc / Mất: Tỷ lệ bồi thường mất sách cấu hình (mặc định 110%)
      totalLostFee += Math.round((bPrice * (lostPct / 100)) / 1000) * 1000;
    }
  });

  // 3. Tổng nghĩa vụ tài chính
  const rawTotalFine = totalOverdueFine + totalDamageFee + totalLostFee;
  const discountAmount = Math.round(((rawTotalFine * waiverDiscountPercent) / 100) / 1000) * 1000;
  const finalFine = Math.max(0, Math.round((rawTotalFine - discountAmount) / 1000) * 1000);

  // Tra cứu thông tin sách đang mượn qua API Backend
  const handleLookup = async (codeToSearch) => {
    const q = (codeToSearch !== undefined ? codeToSearch : returnQuery).trim();
    if (!q) {
      showToast?.('⚠️ Vui lòng nhập hoặc quét Mã vạch bản sao (BC000001-A) hoặc Mã phiếu mượn.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await returnApi.lookup(q);
      if (res.success && res.data) {
        setLookupData(res.data);
        playScannerBeep?.(true);
        const countMsg = res.data.items?.length ? ` (${res.data.items.length} cuốn)` : '';
        showToast?.(`🔍 Đã tìm thấy: Phiếu ${res.data.borrowCode}${countMsg} của bạn đọc ${res.data.readerName}`);
      } else {
        playScannerBeep?.(false);
        showToast?.(`⚠️ ${res.message || 'Không tìm thấy sách đang mượn khớp với mã đã nhập.'}`);
        setLookupData(null);
      }
    } catch (err) {
      playScannerBeep?.(false);
      const errMsg = err.response?.data?.message || err.message || 'Không thể tra cứu thông tin sách.';
      showToast?.(`⚠️ ${errMsg}`);
      setLookupData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Xử lý dán mã hoặc hình ảnh barcode khi trả sách (Ctrl + V)
  const handleReturnPaste = async (e) => {
    const imageFile = getImageFileFromClipboard(e);
    if (imageFile) {
      e.preventDefault();
      showToast?.('📷 Đang quét mã vạch từ ảnh dán (Ctrl + V)...');
      setIsSearching(true);
      try {
        const res = await decodeBarcodeFromImage(imageFile);
        if (res && res.success && res.barcode) {
          const detected = res.barcode.trim().toUpperCase();
          showToast?.(`🎯 Nhận diện thành công mã: ${detected}`);
          setReturnQuery(detected);
          await handleLookup(detected);
        } else {
          showToast?.('⚠️ Không tìm thấy mã vạch hợp lệ trong ảnh.');
        }
      } catch (err) {
        showToast?.('❌ Lỗi khi đọc ảnh mã vạch: ' + (err.message || ''));
      } finally {
        setIsSearching(false);
      }
      return;
    }

    const pastedText = e.clipboardData?.getData('text');
    if (pastedText) {
      const clean = pastedText.trim().toUpperCase();
      if (clean) {
        e.preventDefault();
        setReturnQuery(clean);
        showToast?.(`📋 Đã dán mã tra cứu: ${clean}`);
        await handleLookup(clean);
      }
    }
  };

  // Áp dụng tỷ lệ miễn giảm phạt
  const handleApplyWaiver = (discountPct, reasonText) => {
    setWaiverDiscountPercent(discountPct);
    setWaiverReason(reasonText);
    setShowWaiverModal(false);
    showToast?.(`🎉 Đã áp dụng miễn giảm ${discountPct}% (${reasonText})`);
  };

  // Tạo danh sách các cuốn sách hoàn chỉnh kèm ghi chú tình trạng để đưa vào Phiếu trả A4
  const buildSlipItems = () => {
    return bookList.map((b) => {
      const isSelected = selectedReturnBarcodes.includes(b.barcode);
      const cond = getBookCondition(b.barcode);
      let note = 'Nguyên vẹn';

      if (b.isReturned) {
        note = 'Đã trả trước';
      } else if (!isSelected) {
        note = 'Chưa trả (Giữ lại đọc tiếp)';
      } else if (cond.status === 'damaged') {
        if (cond.damageLevel === 1) note = `Hư hỏng nhẹ (${damageLightPct}%)`;
        else if (cond.damageLevel === 2) note = `Hư hỏng vừa (${damageMedPct}%)`;
        else if (cond.damageLevel === 3) note = `Hư hỏng nặng (${damageSeverePct}%)`;
      } else if (cond.status === 'lost') {
        note = `Thất lạc / Báo mất (${lostPct}%)`;
      } else if (isOverdue) {
        note = `Trễ ${overdueDays} ngày`;
      }

      return {
        title: b.bookTitle,
        author: b.author || 'Nhiều tác giả',
        barcode: b.barcode,
        dueDate: new Date(lookupData.dueDate).toLocaleDateString('vi-VN'),
        returnDate: b.isReturned || isSelected ? new Date().toLocaleDateString('vi-VN') : '—',
        note: note
      };
    });
  };

  // Xác nhận xử lý trả các cuốn sách được chọn qua API Backend (POST /api/returns/process-item)
  const handleExecuteReturn = async (isPaidFine = false) => {
    if (!lookupData || booksToActuallyReturn.length === 0) {
      showToast?.('⚠️ Vui lòng chọn ít nhất 1 cuốn sách để thực hiện hoàn trả.');
      return;
    }

    setIsSubmitting(true);
    let lastResult = null;
    const createdReceiptIds = [];

    try {
      // Xử lý hoàn trả lần lượt từng cuốn sách ĐƯỢC CHỌN
      for (const item of booksToActuallyReturn) {
        const cond = getBookCondition(item.barcode);
        let condition = 'Good';
        let damagePct = undefined;
        let noteText = 'Sách hoàn trả nguyên vẹn';

        if (cond.status === 'damaged') {
          if (cond.damageLevel === 1) {
            condition = 'DamagedLight';
            damagePct = damageLightPct;
            noteText = `Hư hỏng nhẹ (Đền bù ${damageLightPct}% giá bìa)`;
          } else if (cond.damageLevel === 2) {
            condition = 'DamagedMedium';
            damagePct = damageMedPct;
            noteText = `Hư hỏng vừa (Đền bù ${damageMedPct}% giá bìa)`;
          } else if (cond.damageLevel === 3) {
            condition = 'DamagedSevere';
            damagePct = damageSeverePct;
            noteText = `Hư hỏng nặng (${damageSeverePct}% giá bìa)`;
          }
        } else if (cond.status === 'lost') {
          condition = 'Lost';
          damagePct = lostPct;
          noteText = `Báo mất tài liệu (${lostPct}% giá bìa)`;
        }

        const payload = {
          barcode: item.barcode,
          condition: condition,
          damagePercent: damagePct,
          note: noteText,
          waiverDiscountPercent: waiverDiscountPercent,
          waiverReason: waiverReason || undefined
        };

        const res = await returnApi.processReturn(payload);
        if (res.success && res.data) {
          lastResult = res.data;
          if (res.data.receiptId) {
            createdReceiptIds.push(res.data.receiptId);
          }
        }
      }

      playScannerBeep?.(true);
      showToast?.(`✅ Đã hoàn tất tiếp nhận trả ${booksToActuallyReturn.length} cuốn sách.`);
      setShowReceiptModal(false);

      // Nếu có phát sinh phạt và thủ thư bấm "Xác nhận thu & Xuất biên lai"
      if (isPaidFine && createdReceiptIds.length > 0) {
        try {
          let lastInvoice = null;
          let totalCombinedPaid = 0;

          // Thanh toán toàn bộ các khoản phạt phát sinh cho tất cả các cuốn sách trong đợt trả
          for (const rId of createdReceiptIds) {
            const invRes = await invoiceApi.createInvoice({
              receiptId: rId,
              paymentMethod: paymentMethod === 'transfer' ? 'Transfer' : 'Cash',
              note: `Thu tiền phạt tại quầy lưu thông (${lookupData.borrowCode})`
            });

            if (invRes.success && invRes.data) {
              lastInvoice = invRes.data;
              totalCombinedPaid += (invRes.data.amountPaid || 0);
            }
          }

          if (lastInvoice) {
            // Chuẩn hóa hiển thị tổng số tiền thực thu của cả đợt trả nhiều cuốn
            setPaidInvoiceData({
              ...lastInvoice,
              amountPaid: totalCombinedPaid > 0 ? totalCombinedPaid : lastInvoice.amountPaid,
              totalAmount: totalCombinedPaid > 0 ? totalCombinedPaid : lastInvoice.totalAmount
            });
            setShowPaidReceiptModal(true);
            showToast?.(`🎉 Đã lập hóa đơn ${lastInvoice.invoiceCode} cho toàn bộ ${createdReceiptIds.length} cuốn sách và mở lại quyền mượn sách!`);
          }
        } catch (invErr) {
          console.error('Lỗi khi lập hóa đơn thu phạt:', invErr);
          const errDetail = invErr.response?.data?.message || invErr.message || '';
          showToast?.(`⚠️ Tiếp nhận trả thành công nhưng chưa lập được hóa đơn: ${errDetail}`);
        }
      }

      // Chuẩn bị danh sách đầy đủ toàn bộ sách để in trên phiếu trả
      const slipItems = buildSlipItems();

      // Gọi callback báo cho trang cha cập nhật bảng giao dịch và mở Modal Phiếu trả
      onReturnSuccess?.({
        ...(lastResult || {}),
        borrowCode: lookupData.borrowCode,
        paymentMethod: isPaidFine ? paymentMethod : null,
        waiverDiscountPercent: waiverDiscountPercent,
        readerName: lookupData.readerName,
        readerCode: lookupData.readerCode,
        department: (lookupData.department && lookupData.department !== 'Standard')
          ? lookupData.department
          : (lookupData.memberType === 'Lecturer' ? 'Cán bộ / Giảng viên' : 'Khoa Công nghệ Thông tin'),
        bookTitle: booksToActuallyReturn[0]?.bookTitle || lookupData.bookTitle,
        barcode: booksToActuallyReturn[0]?.barcode || lookupData.barcode,
        borrowDate: new Date(lookupData.borrowDate).toLocaleDateString('vi-VN'),
        dueDate: new Date(lookupData.dueDate).toLocaleDateString('vi-VN'),
        returnDate: new Date().toLocaleDateString('vi-VN'),
        totalFine: finalFine,
        finalFine: finalFine,
        isOverdue: isOverdue,
        overdueDays: overdueDays,
        overdueFine: totalOverdueFine,
        damageFee: totalDamageFee,
        lostFee: totalLostFee,
        items: slipItems
      });

      // Nếu chỉ trả một phần (vẫn còn cuốn chưa trả trong phiếu mượn), tải lại thông tin phiếu để hiển thị trạng thái mới
      if (booksToActuallyReturn.length < activeBooksToReturn.length) {
        const remainingCount = activeBooksToReturn.length - booksToActuallyReturn.length;
        showToast?.(`ℹ️ Phiếu ${lookupData.borrowCode} vẫn còn ${remainingCount} cuốn sách chưa trả.`);
        await handleLookup(lookupData.borrowCode);
      } else {
        // Đã trả toàn bộ các cuốn sách trong phiếu
        setLookupData(null);
        setReturnQuery('');
      }
    } catch (err) {
      playScannerBeep?.(false);
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi xử lý tiếp nhận trả sách.';
      showToast?.(`❌ ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* THẺ TRÊN: TIẾP NHẬN TRẢ SÁCH & TÌM KIẾM MÃ VẠCH */}
      <section className="circulation-card" aria-label="Tiếp nhận trả sách và kiểm tra vi phạm">
        <div className="card-header-row">
          <h2 className="card-title">TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM (LOLRA-17)</h2>
          <div className="card-icon-orange" title="Xử lý trả sách">
            <ArrowLeftRight size={20} strokeWidth={2.2} />
          </div>
        </div>

        <p className="card-description">
          Quét mã vạch cuốn sách (BC000001-A), mã phiếu mượn hoặc tải tệp PDF phiếu mượn để hệ thống tự động nhận diện và hoàn trả tài sản về kho.
        </p>

        <div className="card-form">
          <div className="form-group">
            <label htmlFor={returnInputId} className="form-label">
              Mã vạch Barcode bản sao / Mã phiếu mượn
            </label>
            <div className="input-with-icon">
              <button
                type="button"
                className="input-prefix-scan-btn"
                title="Nhấn để tìm kiếm hoặc mở máy quét"
                onClick={() => handleLookup()}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 size={16} className="spin-icon" /> : <Search size={16} />}
              </button>
              <input
                id={returnInputId}
                type="text"
                className="form-control"
                placeholder="Nhập mã vạch (BC000001-A), mã phiếu (PM-0005)... (Ctrl+V để dán)"
                value={returnQuery}
                onChange={(e) => setReturnQuery(e.target.value)}
                onPaste={handleReturnPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
              />
              {returnQuery && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => {
                    setReturnQuery('');
                    setLookupData(null);
                    showToast?.('ℹ️ Đã xóa nội dung tìm kiếm');
                  }}
                  title="Xóa nội dung tìm kiếm (X)"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Thanh chip kiểm thử nhanh các bản sao đang mượn */}
          <div className="quick-test-bar">
            <span className="quick-test-label">Thử quét nhanh:</span>
            <button
              type="button"
              className="test-chip chip-success"
              title="Thử trả cuốn BC000017-B (Bill Bryson)"
              onClick={() => {
                setReturnQuery('BC000017-B');
                handleLookup('BC000017-B');
              }}
            >
              🏷️ BC000017-B (Quá hạn)
            </button>
            <button
              type="button"
              className="test-chip chip-neutral"
              title="Thử tra cứu phiếu PM-0031"
              onClick={() => {
                setReturnQuery('PM-0031');
                handleLookup('PM-0031');
              }}
            >
              📋 PM-0031
            </button>
          </div>

          {/* Khung tương tác mở Máy Quét Mã Vạch (Live Cam / Upload PDF & Ảnh) */}
          <div
            className={`barcode-scanner-zone ${isScannerModalOpen ? 'is-scanning' : ''}`}
            onClick={() => setIsScannerModalOpen(true)}
            title="Nhấn vào đây để mở Máy Quét Mã Vạch Barcode Scanner"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ScanLine size={16} style={{ color: '#2563eb' }} />
              <span className="scanner-text" style={{ fontWeight: 600, color: '#1e40af' }}>
                [Nhấn vào đây để mở Máy Quét Barcode / Tải PDF phiếu mượn...]
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* THẺ DƯỚI: CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ (Chỉ hiển thị khi đã tìm thấy sách) */}
      {lookupData && (
        <section className="circulation-card return-detail-card" aria-label="Chi tiết kiểm tra sách hoàn trả">
          <div className="card-header-row">
            <h2 className="card-title">
              CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ ({lookupData.borrowCode})
            </h2>
            <button
              type="button"
              className="btn-close-detail"
              onClick={() => {
                setLookupData(null);
                setReturnQuery('');
                showToast?.('ℹ️ Đã đóng chi tiết hoàn trả');
              }}
              title="Đóng và xóa chi tiết hoàn trả"
            >
              <X size={16} />
              <span>Đóng</span>
            </button>
          </div>

          {/* 4 Cột siêu dữ liệu độc giả & tài liệu */}
          <div className="metadata-grid">
            <div className="meta-item">
              <span className="meta-label">ĐỘC GIẢ</span>
              <span className="meta-value">
                {lookupData.readerName} ({lookupData.readerCode})
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">SÁCH MƯỢN TRONG PHIẾU</span>
              <span className="meta-value">
                {bookList.length} cuốn tài liệu ({activeBooksToReturn.length} chưa trả)
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {bookList.map((b, bIdx) => (
                    <span key={b.barcode || bIdx} className="barcode-tag" title={b.bookTitle}>
                      <Barcode size={13} className="barcode-inline-icon" />
                      <span>{b.barcode}</span>
                    </span>
                  ))}
                </div>
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">NGÀY MƯỢN</span>
              <span className="meta-value">
                {new Date(lookupData.borrowDate).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">HẠN TRẢ DỰ KIẾN</span>
              <span className="meta-value">
                {new Date(lookupData.dueDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* PHẦN: HẠN TRẢ SÁCH (Bỏ số 1) */}
          <div className="compact-section-wrap">
            <div className="compact-header-row">
              <span className="compact-title-text">Hạn trả sách</span>
            </div>

            {isOnTime ? (
              <div className="compact-status-card ontime">
                <div className="status-left">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <strong className="status-bold-text text-emerald-800">Trả đúng hạn</strong>
                  <span className="status-date-hint">
                    (Hạn: {new Date(lookupData.dueDate).toLocaleDateString('vi-VN')} - Trả: {new Date().toLocaleDateString('vi-VN')})
                  </span>
                </div>
                <span className="compact-tag-free">0đ</span>
              </div>
            ) : (
              <div
                className={`compact-status-card overdue ${showOverdueFormula ? 'expanded' : ''}`}
                onClick={() => setShowOverdueFormula(!showOverdueFormula)}
                title="Nhấn để xem / ẩn công thức tính phạt"
              >
                <div className="status-top-bar">
                  <div className="status-left">
                    <Clock size={16} className="text-amber-600" />
                    <strong className="status-bold-text text-amber-900">Quá hạn {overdueDays} ngày</strong>
                    <span className="status-date-hint">
                      (Hạn: {new Date(lookupData.dueDate).toLocaleDateString('vi-VN')} - Trả: {new Date().toLocaleDateString('vi-VN')})
                    </span>
                    <span className="toggle-btn-hint">
                      {showOverdueFormula ? 'Ẩn công thức' : 'Xem công thức'}
                    </span>
                  </div>
                  <span className="compact-tag-warn">+{totalOverdueFine.toLocaleString('vi-VN')}đ</span>
                </div>

                {showOverdueFormula && (
                  <div className="compact-formula-drawer" onClick={(e) => e.stopPropagation()}>
                    <span>
                      Công thức: <strong>{overdueDays} ngày × {finePerDay.toLocaleString('vi-VN')}đ/ngày (tính cho từng cuốn chưa trả)</strong>
                    </span>
                    {isAnyFineCapped && (
                      <span className="capped-text-note">
                        • Đã áp trần tối đa không quá 100% giá bìa gốc từng cuốn sách
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PHẦN: TÌNH TRẠNG VẬT LÝ TỪNG CUỐN SÁCH (Chia 3 ô trên 1 hàng) */}
          <div className="compact-section-wrap">
            <div className="compact-header-row book-list-header-row">
              <span className="compact-title-text">
                Tình trạng vật lý từng cuốn sách ({bookList.length} cuốn)
              </span>
              <div className="book-selection-toolbar">
                <span className="selection-count-badge">
                  Đã chọn trả: <strong>{booksToActuallyReturn.length}/{activeBooksToReturn.length}</strong> cuốn
                </span>
                {activeBooksToReturn.length > 1 && (
                  <div className="selection-quick-actions">
                    <button
                      type="button"
                      className="btn-select-action"
                      onClick={handleSelectAll}
                      title="Chọn trả tất cả sách chưa trả"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      className="btn-select-action"
                      onClick={handleDeselectAll}
                      title="Bỏ chọn tất cả sách"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="return-books-list">
              {bookList.map((item, bIndex) => {
                const bPrice = item.basePrice || 50000;
                const cond = getBookCondition(item.barcode);
                const isDamaged = cond.status === 'damaged';
                const isLost = cond.status === 'lost';
                const level = cond.damageLevel || 1; // 1: 20%, 2: 40%, 3: 110%
                const isSelected = selectedReturnBarcodes.includes(item.barcode);

                const fee20 = Math.round((bPrice * (damageLightPct / 100)) / 1000) * 1000;
                const fee40 = Math.round((bPrice * (damageMedPct / 100)) / 1000) * 1000;
                const fee110 = Math.round((bPrice * (damageSeverePct / 100)) / 1000) * 1000;
                const feeLost = Math.round((bPrice * (lostPct / 100)) / 1000) * 1000;
                const feeLight = fee20;
                const feeMed = fee40;
                const feeSevere = fee110;

                let currentDamageFee = feeLight;
                let currentDamagePct = `${damageLightPct}%`;
                if (level === 2) {
                  currentDamageFee = feeMed;
                  currentDamagePct = `${damageMedPct}%`;
                } else if (level === 3) {
                  currentDamageFee = feeSevere;
                  currentDamagePct = `${damageSeverePct}%`;
                }

                return (
                  <div
                    key={item.barcode || bIndex}
                    className={`book-item-return-card ${item.isReturned ? 'card-already-returned' : (!isSelected ? 'card-unselected' : '')} ${isSelected && (isDamaged || isLost) ? 'card-has-violation' : ''}`}
                  >
                    {/* 1. KHU VỰC THÔNG TIN SÁCH NỔI BẬT HÀNG ĐẦU (TÂM ĐIỂM THỊ GIÁC) */}
                    <div className="book-headline-row">
                      <div className="book-main-identity">
                        {/* Checkbox chọn cuốn sách trả rải rác */}
                        {!item.isReturned && (
                          <label
                            className={`book-select-checkbox-label ${isSelected ? 'is-checked' : ''}`}
                            title={isSelected ? 'Nhấn để bỏ chọn cuốn này (giữ lại đọc tiếp)' : 'Nhấn để chọn trả cuốn sách này'}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectBook(item.barcode)}
                              className="book-select-checkbox-input"
                            />
                            <span className="book-select-custom-box">
                              {isSelected && <Check size={12} strokeWidth={3.5} />}
                            </span>
                            <span className="book-select-text">
                              {isSelected ? 'Chọn trả đợt này' : 'Chưa trả (Giữ lại)'}
                            </span>
                          </label>
                        )}

                        <div className="book-titles-col">
                          <h3 className="book-primary-title">{item.bookTitle}</h3>
                          {item.author && (
                            <span className="book-author-subtitle">Tác giả: {item.author}</span>
                          )}
                        </div>
                      </div>

                      <div className="book-chips-group">
                        <button
                          type="button"
                          className="book-chip-barcode clickable-barcode-chip"
                          title="Nhấn để xem Barcode mã vạch của cuốn sách này"
                          onClick={() => setBarcodePreviewItem(item)}
                        >
                          <Barcode size={13} />
                          <span>{item.barcode}</span>
                        </button>
                        <span className="book-chip-price">
                          Giá gốc: {bPrice.toLocaleString('vi-VN')}đ
                        </span>
                        {item.isReturned && (
                          <span className="book-chip-returned">
                            ✓ Đã hoàn trả trước
                          </span>
                        )}
                      </div>
                    </div>

                    {/* NẾU SÁCH CHƯA ĐƯỢC CHỌN TRẢ: HIỂN THỊ BANNER THÔNG BÁO GIỮ LẠI ĐỌC TIẾP */}
                    {!item.isReturned && !isSelected && (
                      <div className="book-skipped-banner">
                        <div className="skipped-banner-left">
                          <Bookmark size={15} className="skipped-icon" />
                          <span>Độc giả giữ lại đọc tiếp — Cuốn này chưa hoàn trả trong đợt giao dịch hiện tại.</span>
                        </div>
                        <button
                          type="button"
                          className="btn-quick-select"
                          onClick={() => handleToggleSelectBook(item.barcode)}
                          title="Nhấn để chọn hoàn trả cuốn sách này"
                        >
                          + Chọn trả cuốn này
                        </button>
                      </div>
                    )}

                    {/* 2. CHIA 3 Ô TÌNH TRẠNG VẬT LÝ TRÊN 1 HÀNG: NGUYÊN VẸN - HƯ HỎNG - THẤT LẠC / MẤT */}
                    {!item.isReturned && isSelected && (
                      <div className="book-conditions-tri-grid">
                        {/* Ô 1: NGUYÊN VẸN */}
                        <div
                          className={`tri-cond-card card-good ${cond.status === 'good' ? 'is-selected' : ''}`}
                          onClick={() => handleUpdateBookCondition(item.barcode, 'good')}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="tri-cond-header">
                            <div className="tri-cond-radio-title">
                              <span className={`tri-radio-circle ${cond.status === 'good' ? 'checked-good' : ''}`}>
                                {cond.status === 'good' && <Check size={11} strokeWidth={3.5} />}
                              </span>
                              <span className="tri-cond-label">Nguyên vẹn</span>
                            </div>
                            <span className="tri-cond-badge badge-good">0đ</span>
                          </div>
                          <div className="tri-cond-body">
                            <p className="tri-cond-desc">
                              Sách tốt, sẵn sàng nhập lại kho khả dụng (0đ)
                            </p>
                          </div>
                        </div>

                        {/* Ô 2: HƯ HỎNG (TỈ LỆ 3/7: TRÁI 3 PHẦN TIÊU ĐỀ & CHỈ ĐỂ TIỀN, PHẢI 7 PHẦN THANH TRƯỢT CHỈ ĐỂ %) */}
                        <div
                          className={`tri-cond-card card-damaged ${cond.status === 'damaged' ? 'is-selected' : ''}`}
                          onClick={() => {
                            if (cond.status !== 'damaged') {
                              handleUpdateBookCondition(item.barcode, 'damaged', level);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="damaged-card-split-37">
                            {/* Bên trái: 3/10 (Tiêu đề và CHỈ ĐỂ TIỀN) */}
                            <div className="damaged-col-left-3">
                              <div className="tri-cond-radio-title">
                                <span className={`tri-radio-circle ${cond.status === 'damaged' ? 'checked-damaged' : ''}`}>
                                  {cond.status === 'damaged' && <AlertTriangle size={10} strokeWidth={3} />}
                                </span>
                                <span className="tri-cond-label">Hư hỏng</span>
                              </div>
                              <span className="tri-cond-badge badge-damaged">
                                {cond.status === 'damaged'
                                  ? `+${currentDamageFee.toLocaleString('vi-VN')}đ`
                                  : `+${fee20.toLocaleString('vi-VN')}đ`}
                              </span>
                            </div>

                            {/* Bên phải: 7/10 (Thanh trượt có 3 nút tròn đầu/giữa/cuối và 3 nút bấm chỉ để %) */}
                            <div className="damaged-col-right-7" onClick={(e) => e.stopPropagation()}>
                              <div className="tri-slider-wrap">
                                <div className="tri-slider-track-container">
                                  <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="1"
                                    value={level}
                                    onChange={(e) =>
                                      handleUpdateBookCondition(item.barcode, 'damaged', Number(e.target.value))
                                    }
                                    className="tri-slider-input"
                                    aria-label="Mức độ hư hỏng sách"
                                  />
                                  <div className="tri-slider-dots">
                                    <span
                                      className={`slider-dot-mark dot-start ${level >= 1 ? 'dot-active' : ''}`}
                                      onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 1)}
                                      title={`Mức nhẹ (${damageLightPct}%)`}
                                    />
                                    <span
                                      className={`slider-dot-mark dot-middle ${level >= 2 ? 'dot-active' : ''}`}
                                      onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 2)}
                                      title={`Mức vừa (${damageMedPct}%)`}
                                    />
                                    <span
                                      className={`slider-dot-mark dot-end ${level >= 3 ? 'dot-active' : ''}`}
                                      onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 3)}
                                      title={`Mức nặng (${damageSeverePct}%)`}
                                    />
                                  </div>
                                </div>
                                <div className="tri-slider-ticks">
                                  <button
                                    type="button"
                                    className={`tri-tick-btn ${level === 1 ? 'tick-active' : ''}`}
                                    onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 1)}
                                    title={`Mức nhẹ: ${damageLightPct}% giá bìa`}
                                  >
                                    <span className="tick-name">{`Nhẹ (${damageLightPct}%)`}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`tri-tick-btn ${level === 2 ? 'tick-active' : ''}`}
                                    onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 2)}
                                    title={`Mức vừa: ${damageMedPct}% giá bìa`}
                                  >
                                    <span className="tick-name">{`Vừa (${damageMedPct}%)`}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`tri-tick-btn ${level === 3 ? 'tick-active' : ''}`}
                                    onClick={() => handleUpdateBookCondition(item.barcode, 'damaged', 3)}
                                    title={`Mức nặng: ${damageSeverePct}% giá bìa`}
                                  >
                                    <span className="tick-name">{`Nặng (${damageSeverePct}%)`}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ô 3: THẤT LẠC / MẤT */}
                        <div
                          className={`tri-cond-card card-lost ${cond.status === 'lost' ? 'is-selected' : ''}`}
                          onClick={() => handleUpdateBookCondition(item.barcode, 'lost')}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="tri-cond-header">
                            <div className="tri-cond-radio-title">
                              <span className={`tri-radio-circle ${cond.status === 'lost' ? 'checked-lost' : ''}`}>
                                {cond.status === 'lost' && <X size={10} strokeWidth={3.5} />}
                              </span>
                              <span className="tri-cond-label">Thất lạc / Mất</span>
                            </div>
                            <span className="tri-cond-badge badge-lost">
                              +{feeLost.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                          <div className="tri-cond-body">
                            <p className="tri-cond-desc">
                              {`${lostPct}% giá bìa (100% bồi hoàn + ${surchargePct}% phụ thu tài liệu)`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Khung tổng kết tiền phạt dự kiến & các nút hành động */}
          <div className="fine-summary-banner">
            <div className="fine-info-left">
              <div className="fine-total-title">
                Tổng nghĩa vụ tài chính: {finalFine.toLocaleString('vi-VN')} VNĐ
                {waiverDiscountPercent > 0 && (
                  <span className="waiver-badge-applied">
                    (Đã giảm {waiverDiscountPercent}%)
                  </span>
                )}
              </div>
              <div className="fine-breakdown-subtext">
                {finalFine === 0 ? (
                  <span>(Sách hoàn trả đúng hạn, nguyên vẹn - Sẵn sàng nhập lại kho khả dụng)</span>
                ) : (
                  <span>
                    (Chi tiết:{' '}
                    {isOverdue ? (
                      <span>
                        Phạt trễ {overdueDays} ngày = <strong>{totalOverdueFine.toLocaleString('vi-VN')}đ</strong>
                        {isAnyFineCapped ? ' (Có áp trần)' : ''}
                      </span>
                    ) : ''}
                    {isOverdue && (totalDamageFee > 0 || totalLostFee > 0) ? ' + ' : ''}
                    {totalDamageFee > 0 ? (
                      <span>
                        Bồi thường hư hỏng = <strong>{totalDamageFee.toLocaleString('vi-VN')}đ</strong>
                      </span>
                    ) : ''}
                    {totalLostFee > 0 ? (
                      <span>
                        Bồi hoàn mất sách = <strong>{totalLostFee.toLocaleString('vi-VN')}đ</strong> ({lostPct}%)
                      </span>
                    ) : ''}
                    {waiverDiscountPercent > 0 ? (
                      <span> - Miễn giảm = <strong>{discountAmount.toLocaleString('vi-VN')}đ</strong></span>
                    ) : ''}
                    )
                  </span>
                )}
              </div>
            </div>

            <div className="fine-actions-right">
              {/* Nút Xem trước phiếu trả */}
              <button
                type="button"
                className="btn-preview-slip"
                title="Xem trước mẫu phiếu trả sách A4 PDF"
                onClick={() => {
                  const slipItems = buildSlipItems();
                  onReturnSuccess?.({
                    isPreviewOnly: true,
                    borrowCode: lookupData.borrowCode,
                    readerName: lookupData.readerName,
                    readerCode: lookupData.readerCode,
                    department: (lookupData.department && lookupData.department !== 'Standard')
                      ? lookupData.department
                      : (lookupData.memberType === 'Lecturer' ? 'Cán bộ / Giảng viên' : 'Khoa Công nghệ Thông tin'),
                    bookTitle: booksToActuallyReturn[0]?.bookTitle || activeBooksToReturn[0]?.bookTitle || lookupData.bookTitle,
                    barcode: booksToActuallyReturn[0]?.barcode || activeBooksToReturn[0]?.barcode || lookupData.barcode,
                    borrowDate: new Date(lookupData.borrowDate).toLocaleDateString('vi-VN'),
                    dueDate: new Date(lookupData.dueDate).toLocaleDateString('vi-VN'),
                    returnDate: new Date().toLocaleDateString('vi-VN'),
                    finalFine: finalFine,
                    statusText: finalFine === 0 ? 'Trả đúng hạn' : `Phát sinh tiền phạt ${finalFine.toLocaleString('vi-VN')}đ`,
                    items: slipItems
                  });
                }}
              >
                <FileText size={16} />
                <span>Xem trước phiếu trả</span>
              </button>

              {finalFine === 0 ? (
                /* Nút Xác nhận hoàn tất trả sách (Scenario 1) */
                <button
                  type="button"
                  className="btn-confirm-return"
                  onClick={() => handleExecuteReturn(false)}
                  disabled={isSubmitting || booksToActuallyReturn.length === 0}
                  title={booksToActuallyReturn.length === 0 ? 'Vui lòng chọn ít nhất 1 cuốn sách để trả' : 'Xác nhận bạn đọc đã hoàn trả sách đúng hạn và nhập lại kho'}
                >
                  {isSubmitting ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
                  <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận hoàn tất trả sách'}</span>
                </button>
              ) : (
                /* Cụm nút khi có vi phạm phạt (Scenario 2) */
                <>
                  <button
                    type="button"
                    className="btn-waiver"
                    onClick={() => setShowWaiverModal(true)}
                    disabled={waiverDiscountPercent === 100 || isSubmitting || booksToActuallyReturn.length === 0}
                    title={booksToActuallyReturn.length === 0 ? 'Vui lòng chọn sách để xét miễn giảm' : 'Xét duyệt miễn giảm tiền phạt'}
                  >
                    Miễn giảm phạt
                  </button>

                  <button
                    type="button"
                    className="btn-create-receipt"
                    onClick={() => setShowReceiptModal(true)}
                    disabled={isSubmitting || booksToActuallyReturn.length === 0}
                    title={booksToActuallyReturn.length === 0 ? 'Vui lòng chọn ít nhất 1 cuốn sách để thu phạt' : 'Lập phiếu thu phạt cho các cuốn sách được chọn'}
                  >
                    Lập phiếu thu phạt
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MODAL MIỄN GIẢM TIỀN PHẠT */}
      {showWaiverModal && lookupData && (
        <div className="modal-overlay" onClick={() => setShowWaiverModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sparkles size={20} className="modal-icon-sparkle" />
                <h3>Xét duyệt miễn giảm tiền phạt</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowWaiverModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-summary-box">
                <div className="modal-sum-row">
                  <span>Mã phiếu mượn:</span>
                  <strong>{lookupData.borrowCode}</strong>
                </div>
                <div className="modal-sum-row">
                  <span>Độc giả:</span>
                  <span>{lookupData.readerName} ({lookupData.readerCode})</span>
                </div>
                <div className="modal-sum-row">
                  <span>Tổng tiền phạt ban đầu:</span>
                  <span className="text-red-bold">{rawTotalFine.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div className="waiver-options-group">
                <label className="modal-field-label">Chọn tỷ lệ hoặc lý do miễn giảm:</label>
                <div className="waiver-presets-grid">
                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 100 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(100, 'Miễn giảm 100% (Sự cố hệ thống / Ốm đau)')}
                  >
                    <strong>Miễn 100%</strong>
                    <span>Bệnh viện / Bất khả kháng</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 50 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(50, 'Giảm 50% (Sinh viên diện chính sách)')}
                  >
                    <strong>Giảm 50%</strong>
                    <span>Sinh viên chính sách khó khăn</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 20 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(20, 'Giảm 20% (Điểm rèn luyện xuất sắc)')}
                  >
                    <strong>Giảm 20%</strong>
                    <span>Rèn luyện điểm cao (AI)</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 0 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(0, 'Không áp dụng miễn giảm')}
                  >
                    <strong>0% Phạt gốc</strong>
                    <span>Không miễn giảm</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowWaiverModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LẬP BIÊN LAI THU PHẠT */}
      {showReceiptModal && lookupData && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-dialog modal-receipt" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Receipt size={20} className="modal-icon-receipt" />
                <h3>Lập phiếu thu phạt thư viện</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowReceiptModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="receipt-preview-card">
                <div className="receipt-header">
                  <div className="receipt-badge">BIÊN LAI ĐIỆN TỬ SMARTLIB AI</div>
                  <div className="receipt-code">Mã: PT-{new Date().getFullYear()}-{lookupData.borrowCode.replace('PM-', '')}</div>
                </div>

                <div className="receipt-details">
                  <div className="receipt-line">
                    <span className="lbl">Người nộp phạt:</span>
                    <span className="val">{lookupData.readerName}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Mã sinh viên:</span>
                    <span className="val">{lookupData.readerCode}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Tên tài liệu:</span>
                    <span className="val">
                      {booksToActuallyReturn.length > 0
                        ? booksToActuallyReturn.map((b) => b.bookTitle).join(', ')
                        : lookupData.bookTitle}
                    </span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Lý do xử phạt:</span>
                    <span className="val">
                      {(() => {
                        const reasons = [];
                        if (isOverdue && totalOverdueFine > 0) {
                          reasons.push(`Trễ hạn ${overdueDays} ngày (${totalOverdueFine.toLocaleString('vi-VN')}đ)`);
                        }
                        if (totalDamageFee > 0) {
                          reasons.push(`Bồi thường hư hỏng sách (${totalDamageFee.toLocaleString('vi-VN')}đ)`);
                        }
                        if (totalLostFee > 0) {
                          reasons.push(`Bồi hoàn thất lạc sách (${totalLostFee.toLocaleString('vi-VN')}đ)`);
                        }
                        return reasons.join(' + ') || 'Vi phạm quy định mượn trả';
                      })()}
                    </span>
                  </div>
                  <div className="receipt-divider"></div>
                  <div className="receipt-line-total">
                    <span>Số tiền thực thu:</span>
                    <span className="receipt-amount">{finalFine.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                </div>
              </div>

              {/* Lựa chọn phương thức thanh toán */}
              <div className="payment-methods-box">
                <div className="modal-field-label">Phương thức thanh toán:</div>
                <div className="payment-options">
                  <label
                    className={`pay-option ${paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote size={18} />
                    <span>Tiền mặt tại quầy</span>
                  </label>
                  <label
                    className={`pay-option ${paymentMethod === 'transfer' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('transfer')}
                  >
                    <QrCode size={18} />
                    <span>Chuyển khoản QR code</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowReceiptModal(false)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-submit-pay"
                onClick={() => handleExecuteReturn(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 size={15} className="spin-icon" /> : <Printer size={15} />}
                <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận thu & Xuất biên lai'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÁY QUÉT BARCODE CAMERA MODAL (Hỗ trợ Live Webcam, Lật ngang, Zoom, Tải PDF & Ảnh) */}
      <BarcodeCameraModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerModalOpen(false);
          setReturnQuery(code);
          handleLookup(code);
        }}
        targetField="return"
        title="MÁY QUÉT MÃ VẠCH SÁCH HOÀN TRẢ (RETURN SCANNER)"
      />

      {/* MODAL BIÊN LAI THU PHẠT KẾ TOÁN BẤT BIẾN K80 / A5 (Story LOLRA-19) */}
      {paidInvoiceData && (
        <ReceiptModal
          isOpen={showPaidReceiptModal}
          onClose={() => setShowPaidReceiptModal(false)}
          invoiceData={paidInvoiceData}
          defaultFormat="k80"
        />
      )}

      {/* MODAL XEM MÃ VẠCH (BARCODE) CỦA CUỐN SÁCH KHI CLICK MÃ SÁCH */}
      {barcodePreviewItem && (
        <div
          className="barcode-preview-overlay"
          onClick={() => setBarcodePreviewItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="barcode-preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="barcode-preview-header">
              <div className="barcode-preview-header-left">
                <Barcode size={20} className="text-blue-600" />
                <h3 className="barcode-preview-title">MÃ VẠCH BẢN SAO SÁCH</h3>
              </div>
              <button
                type="button"
                className="barcode-preview-close"
                onClick={() => setBarcodePreviewItem(null)}
                title="Đóng xem mã vạch"
              >
                <X size={18} />
              </button>
            </div>

            <div className="barcode-preview-content">
              <div className="barcode-preview-meta">
                <div className="barcode-meta-title">{barcodePreviewItem.bookTitle}</div>
                {barcodePreviewItem.author && (
                  <div className="barcode-meta-author">Tác giả: {barcodePreviewItem.author}</div>
                )}
                <div className="barcode-meta-code">
                  Mã bản sao: <strong>{barcodePreviewItem.barcode}</strong>
                </div>
              </div>

              <div
                className="barcode-preview-svg-wrap"
                dangerouslySetInnerHTML={{
                  __html: generateBarcodeSvg(barcodePreviewItem.barcode, {
                    width: 320,
                    height: 90,
                    showText: true,
                    fontSize: 14,
                    bgColor: '#ffffff',
                    barColor: '#0f172a',
                    margin: 8
                  })
                }}
              />

              <div className="barcode-preview-footer">
                <button
                  type="button"
                  className="btn-barcode-copy"
                  onClick={() => {
                    navigator.clipboard?.writeText(barcodePreviewItem.barcode);
                    showToast?.(`📋 Đã sao chép mã: ${barcodePreviewItem.barcode}`);
                  }}
                >
                  Sao chép mã ({barcodePreviewItem.barcode})
                </button>
                <button
                  type="button"
                  className="btn-barcode-dismiss"
                  onClick={() => setBarcodePreviewItem(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
