import { createContext, useContext, type ReactNode } from "react";
import { API } from "@/api";

export interface ProjectAssetFilesApi {
  getFileUrl: (projectName: string, path: string, cacheBust?: number | string | null) => string;
  uploadFile: (
    projectName: string,
    uploadType: string,
    file: File,
    name: string | null,
  ) => Promise<unknown>;
}

const defaultApi: ProjectAssetFilesApi = {
  getFileUrl: (projectName, path, cacheBust) => API.getFileUrl(projectName, path, cacheBust),
  uploadFile: (projectName, uploadType, file, name) =>
    API.uploadFile(projectName, uploadType, file, name),
};

const ProjectAssetFilesContext = createContext<ProjectAssetFilesApi>(defaultApi);

export function ProjectAssetFilesProvider({
  value,
  children,
}: {
  value?: Partial<ProjectAssetFilesApi>;
  children: ReactNode;
}) {
  const api = { ...defaultApi, ...value };
  return (
    <ProjectAssetFilesContext.Provider value={api}>{children}</ProjectAssetFilesContext.Provider>
  );
}

export function useProjectAssetFiles(): ProjectAssetFilesApi {
  return useContext(ProjectAssetFilesContext);
}
