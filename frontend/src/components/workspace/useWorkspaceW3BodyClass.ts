import { useEffect } from "react";

let w3MountCount = 0;

/** 在工作空间路由挂载时给 body 加 Web3 主题 class，使 portal 弹窗与同页按钮共用 accent token */
export function useWorkspaceW3BodyClass() {
  useEffect(() => {
    w3MountCount += 1;
    document.body.classList.add("workspace-w3");
    return () => {
      w3MountCount = Math.max(0, w3MountCount - 1);
      if (w3MountCount === 0) {
        document.body.classList.remove("workspace-w3");
      }
    };
  }, []);
}
