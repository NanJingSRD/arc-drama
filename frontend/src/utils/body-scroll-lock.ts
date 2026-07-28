/** 当前可见滚动条占用的宽度（px） */
export function getScrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

/** 锁定 body 滚动，并补偿滚动条宽度，避免 overflow:hidden 导致页面横向跳动 */
export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount += 1;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
      document.body.style.paddingRight = savedPaddingRight;
    }
  };
}
