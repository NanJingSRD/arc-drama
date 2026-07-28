import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";

export const AssetLibraryHeaderActionsContext = createContext<Dispatch<
  SetStateAction<ReactNode>
> | null>(null);

export function useAssetLibraryHeaderActionsSetter() {
  return useContext(AssetLibraryHeaderActionsContext);
}
