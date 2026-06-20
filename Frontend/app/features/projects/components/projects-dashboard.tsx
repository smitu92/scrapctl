import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { FolderOpen, FileText, Download, Play, FolderPlus, FileJson, FileIcon, Search, Trash2, Edit3, AlertTriangle, XCircle, CheckCircle2, Eye, ChevronLeft, ChevronRight, X, CloudUpload, Cloud, Check, Loader2 } from "lucide-react";
import api from "~/../axios";

interface FileItem {
  id: string;
  name: string;
  path: string;
  size_bytes: number;
  modified_at: string;
  type: string;
  synced?: boolean;
}

interface ProjectFolder {
  id: string;
  name: string;
  path: string;
  files: FileItem[];
  created_at: string;
}

const formatBrowserTime = (isoString?: string | null) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString();
  } catch {
    return isoString;
  }
};

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  
  // Preview states
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedSyncFiles, setSelectedSyncFiles] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  
  useEffect(() => {
    setNameExists(projects.some(p => p.name.toLowerCase() === newFolderName.toLowerCase()));
  }, [newFolderName, projects]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/projects");
      setProjects(res.data);
      if (res.data.length > 0) {
        if (selectedProject) {
          const updated = res.data.find((p: any) => p.id === selectedProject.id);
          if (updated) {
            setSelectedProject(updated);
          } else {
            setSelectedProject(res.data[0]);
          }
        } else {
          setSelectedProject(res.data[0]);
        }
      } else {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleSync = async (fileId: string) => {
    setIsSyncing(true);
    setSelectedSyncFiles([fileId]);
    try {
      await api.post(`/api/projects/sync/${fileId}`);
      await fetchProjects();
    } catch (err: any) {
      console.error("Sync failed", err);
      const msg = err.response?.data?.detail || "Failed to sync file to cloud";
      alert(msg);
    } finally {
      setIsSyncing(false);
      setSelectedSyncFiles([]);
    }
  };

  const handleSyncSelected = async () => {
    if (selectedSyncFiles.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;
    const filesToSync = [...selectedSyncFiles];
    
    for (let i = 0; i < filesToSync.length; i++) {
      const fileId = filesToSync[i];
      const fileObj = selectedProject?.files.find(f => f.id === fileId);
      const filename = fileObj ? fileObj.name : "File";
      setSyncProgress(`Syncing ${i + 1}/${filesToSync.length}: ${filename}...`);
      
      try {
        await api.post(`/api/projects/sync/${fileId}`);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync file ${fileId}`, err);
        failCount++;
      }
    }
    
    setSyncProgress(`Sync completed: ${successCount} successful, ${failCount} failed.`);
    await fetchProjects();
    
    setIsSyncing(false);
    if (failCount === 0) {
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setSyncProgress(null);
        setSelectedSyncFiles([]);
      }, 1500);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName || nameExists) return;
    try {
      await api.post(`/api/projects/folder?name=${encodeURIComponent(newFolderName)}`);
      setNewFolderName("");
      setIsCreatingFolder(false);
      fetchProjects();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create folder";
      alert(msg);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove it from the disk permanently.`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
      if (selectedProject?.id === id) setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert("Failed to delete item");
    }
  };

  const handleRename = async (id: string) => {
    if (!editName) return;
    try {
      await api.patch(`/api/projects/${id}/rename?name=${encodeURIComponent(editName)}`);
      setIsEditing(null);
      fetchProjects();
    } catch (err) {
      alert("Failed to rename item");
    }
  };

  const handleWipeAll = async () => {
    if (!confirm("CRITICAL_ACTION: This will delete ALL data in the output directory. Proceed?")) return;
    try {
      await api.delete("/api/projects/all");
      setProjects([]);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert("Wipe failed");
    }
  };

  const handleDownload = (file: FileItem) => {
    const url = `${api.defaults.baseURL}/api/projects/download/${file.id}`;
    window.location.assign(url);
  };

  const handlePreview = async (file: FileItem, page = 1) => {
    setPreviewFile(file);
    setIsPreviewing(true);
    setIsPreviewLoading(true);
    setPreviewPage(page);
    try {
      const res = await api.get(`/api/projects/preview/${file.id}?page=${page}&page_size=100`);
      setPreviewData(res.data);
    } catch (err) {
      console.error("Preview failed", err);
      alert("Failed to load preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith(".json")) return <FileJson className="w-4 h-4 text-rose-500" />;
    if (name.endsWith(".csv")) return <FileText className="w-4 h-4 text-emerald-500" />;
    return <FileIcon className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between border-b-2 border-border pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 border-2 border-primary">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Projects_Explorer
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              ID_BASED_FS_ACTIVE
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="destructive" 
            className="rounded-none border-2 h-12 font-black tracking-widest gap-2 uppercase hover:bg-red-600 transition-all px-4" 
            onClick={handleWipeAll}
          >
            <AlertTriangle className="w-4 h-4" /> WIPE_ALL
          </Button>
          <Button 
            variant="outline" 
            className="rounded-none border-2 h-12 font-black tracking-widest gap-2 uppercase hover:bg-primary hover:text-white transition-all" 
            onClick={fetchProjects}
          >
            REFRESH_DIR
          </Button>
          <Button 
            className="rounded-none h-12 font-black tracking-widest gap-2 uppercase bg-primary text-white px-8"
            onClick={() => setIsCreatingFolder(true)}
          >
            <FolderPlus className="w-4 h-4" /> NEW_FOLDER
          </Button>
        </div>
      </div>

      {isCreatingFolder && (
        <div className="p-4 border-2 border-primary bg-primary/5 space-y-3 animate-in slide-in-from-top-4">
           <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <input 
                  autoFocus
                  className={`w-full bg-background border-2 p-2 font-mono text-sm outline-none transition-all ${
                    nameExists ? "border-destructive text-destructive" : "border-border focus:border-primary"
                  }`}
                  placeholder="ENTER_FOLDER_NAME..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   {newFolderName && (
                     nameExists ? (
                       <XCircle className="w-4 h-4 text-destructive" />
                     ) : (
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     )
                   )}
                </div>
              </div>
              <Button onClick={handleCreateFolder} disabled={nameExists || !newFolderName} className="rounded-none">CREATE</Button>
              <Button variant="ghost" onClick={() => setIsCreatingFolder(false)} className="rounded-none">CANCEL</Button>
           </div>
           {nameExists && (
             <p className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> FOLDER_NAME_ALREADY_RESERVED_IN_POOL
             </p>
           )}
        </div>
      )}

      <div className="flex flex-1 gap-8 min-h-0">
        {/* Sidebar Directory Tree */}
        <Card className="w-80 border-2 rounded-none bg-card overflow-hidden flex flex-col shrink-0 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="p-4 border-b-2 border-border flex justify-between items-center bg-background">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">LOCAL_PROJECTS</span>
            <Badge variant="outline" className="rounded-none font-mono text-[10px] bg-primary text-white border-primary">ACTIVE</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono">
            {isLoading ? (
               <div className="p-4 text-center opacity-30 text-xs italic">Scanning disk...</div>
            ) : projects.length === 0 ? (
               <div className="p-4 text-center opacity-30 text-xs italic">No projects found.</div>
            ) : projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`flex items-center justify-between p-3 text-xs cursor-pointer border-2 transition-all group ${
                  selectedProject?.id === proj.id 
                    ? "bg-primary text-white border-primary translate-x-1" 
                    : "border-transparent hover:border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                   {isEditing === proj.id ? (
                    <input 
                      autoFocus
                      className="bg-background text-foreground border border-primary px-1 w-full outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(proj.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(proj.id)}
                    />
                  ) : (
                    <>
                      <FolderOpen className={`w-4 h-4 shrink-0 ${selectedProject?.id === proj.id ? 'text-white' : 'text-primary'}`} />
                      <span className="truncate font-bold uppercase tracking-tighter">{proj.name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 rounded-none p-1 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(proj.id);
                      setEditName(proj.name);
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 rounded-none p-1 hover:bg-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(proj.id, proj.name);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Main Content Area */}
        <Card className="flex-1 border-2 rounded-none flex flex-col min-w-0 bg-background shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="bg-muted/30 p-4 border-b-2 border-border flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active_Selection:</span>
                   <span className="font-mono text-xs font-bold text-primary">{selectedProject?.name || "None"}</span>
                </div>
                {selectedProject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 transition-all font-mono text-[10px] font-black tracking-widest h-7 px-3 flex items-center gap-2"
                    onClick={() => {
                      const unsyncedFiles = selectedProject.files.filter(f => !f.synced).map(f => f.id);
                      setSelectedSyncFiles(unsyncedFiles);
                      setIsSyncModalOpen(true);
                      setSyncProgress(null);
                    }}
                  >
                    <CloudUpload className="w-3.5 h-3.5" /> SYNC_CLOUD
                  </Button>
                )}
             </div>
             <div className="text-[10px] font-mono text-muted-foreground italic">
                ID: {selectedProject?.id || "-"}
             </div>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-card border-b-2 border-border sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black text-foreground tracking-[0.2em] uppercase text-[10px]">Filename</TableHead>
                  <TableHead className="font-black text-foreground tracking-[0.2em] uppercase text-[10px] w-32">Data_Size</TableHead>
                  <TableHead className="font-black text-foreground tracking-[0.2em] uppercase text-[10px] w-48">Timestamp</TableHead>
                  <TableHead className="font-black text-foreground tracking-[0.2em] uppercase text-[10px] w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProject?.files.map((file, i) => (
                  <TableRow key={file.id} className="border-b border-border/50 hover:bg-muted/50 group">
                    <TableCell className="font-mono text-[11px] font-bold flex items-center gap-3 py-4">
                      {getFileIcon(file.name)}
                      {file.name}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{formatSize(file.size_bytes)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{formatBrowserTime(file.modified_at)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="rounded-none border-2 h-8 w-8 hover:bg-emerald-500 hover:text-white transition-all"
                        onClick={() => handlePreview(file)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="rounded-none border-2 h-8 w-8 hover:bg-primary hover:text-white transition-all"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {file.synced ? (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          disabled
                          className="rounded-none border-2 h-8 w-8 border-emerald-500/30 text-emerald-500 bg-emerald-500/10 cursor-default"
                        >
                          <div className="relative">
                            <Cloud className="w-4 h-4" />
                            <Check className="w-2.5 h-2.5 absolute -bottom-1 -right-1 text-emerald-500 bg-background rounded-full border border-emerald-500" />
                          </div>
                        </Button>
                      ) : (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="rounded-none border-2 h-8 w-8 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                          onClick={() => handleSingleSync(file.id)}
                          disabled={isSyncing}
                        >
                          {isSyncing && selectedSyncFiles.includes(file.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          ) : (
                            <CloudUpload className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="rounded-none border-2 h-8 w-8 hover:bg-destructive hover:text-white transition-all text-muted-foreground"
                        onClick={() => handleDelete(file.id, file.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!selectedProject || selectedProject.files.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground font-mono italic opacity-30">
                      NO_ITEMS_IN_DIRECTORY
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="border-t-2 border-border p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-card mt-auto shrink-0">
            <div>
              {selectedProject?.files.length || 0} ITEMS_IN_POOL &nbsp;&nbsp;&nbsp; 
              SIZE_ALLOCATED: {formatSize(selectedProject?.files.reduce((acc, f) => acc + f.size_bytes, 0) || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 animate-pulse" /> SYSTEM_ONLINE
            </div>
          </div>
        </Card>
      </div>

      {/* PREVIEW MODAL / OVERLAY */}
      {isPreviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full h-full border-4 border-primary rounded-none shadow-[16px_16px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden bg-background">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-6 flex justify-between items-center shrink-0 border-b-4 border-black/10">
                 <div className="flex items-center gap-4">
                    <div className="bg-black/20 p-3 border-2 border-white/20">
                       {previewFile && getFileIcon(previewFile.name)}
                    </div>
                    <div>
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{previewFile?.name}</h2>
                       <p className="text-[10px] font-mono mt-1 opacity-80 uppercase tracking-widest font-bold">
                         PREVIEW_MODE: PAGINATED_100_ROWS | PAGE_{previewPage}
                       </p>
                    </div>
                 </div>
                 <Button 
                    variant="ghost" 
                    onClick={() => setIsPreviewing(false)} 
                    className="hover:bg-black/20 text-primary-foreground rounded-none h-14 w-14 p-0 transition-colors"
                 >
                    <X className="w-8 h-8" />
                 </Button>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-hidden p-6 flex flex-col bg-muted/5">
                 {isPreviewLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6">
                       <div className="w-16 h-16 border-8 border-primary border-t-transparent animate-spin" />
                       <div className="space-y-2 text-center">
                         <p className="font-mono text-sm font-black uppercase tracking-[0.4em] animate-pulse">Accessing_Data_Pool...</p>
                         <p className="text-[10px] font-mono text-muted-foreground uppercase">Please wait while we stream the content</p>
                       </div>
                    </div>
                 ) : (
                    <div className="relative flex-1 overflow-hidden border-2 border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-background">
                       <div className="absolute inset-0 overflow-auto custom-scrollbar">
                         <Table className="relative min-w-full border-collapse">
                            <TableHeader className="bg-card sticky top-0 z-20 border-b-2 border-border">
                               <TableRow className="hover:bg-transparent">
                                  <TableHead className="font-black text-foreground uppercase text-[10px] tracking-widest px-4 py-4 w-20 bg-card border-r-2 border-border sticky left-0 z-30">S.NO</TableHead>
                                  {previewData?.type === "csv" ? (
                                     previewData.headers.map((h: string) => (
                                        <TableHead key={h} className="font-black text-foreground uppercase text-[10px] tracking-widest whitespace-nowrap px-6 py-4 bg-card border-r border-border last:border-r-0 min-w-[200px]">{h}</TableHead>
                                     ))
                                  ) : (
                                     <TableHead className="font-black text-foreground uppercase text-[10px] tracking-widest px-6 py-4 bg-card">JSON_DATA_STREAM</TableHead>
                                  )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {previewData?.data.map((row: any, i: number) => {
                                  const globalIndex = (previewPage - 1) * 100 + i + 1;
                                  return (
                                     <TableRow key={i} className="hover:bg-primary/5 border-b border-border transition-colors group">
                                        <TableCell className="font-mono text-[10px] font-black text-primary px-4 py-3 bg-muted/30 border-r-2 border-border sticky left-0 z-10 group-hover:bg-primary group-hover:text-white transition-colors">{globalIndex}</TableCell>
                                        {previewData.type === "csv" ? (
                                           previewData.headers.map((h: string) => (
                                              <TableCell key={h} className="font-mono text-[11px] px-6 py-3 border-r border-border/10 last:border-r-0 max-w-[400px] truncate group-hover:border-primary/20">{String(row[h] || "-")}</TableCell>
                                           ))
                                        ) : (
                                           <TableCell className="font-mono text-[11px] p-6 bg-muted/5">
                                              <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(row, null, 2)}</pre>
                                           </TableCell>
                                        )}
                                     </TableRow>
                                  );
                               })}
                            </TableBody>
                         </Table>
                       </div>
                    </div>
                 )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-card border-t-4 border-border flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <Button 
                       variant="outline" 
                       disabled={previewPage === 1 || isPreviewLoading}
                       onClick={() => handlePreview(previewFile!, previewPage - 1)}
                       className="rounded-none border-2 border-border h-12 font-black gap-3 uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all px-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                       <ChevronLeft className="w-5 h-5" /> PREVIOUS
                    </Button>
                    <div className="font-mono text-xs font-black uppercase tracking-widest text-primary px-6 py-3 bg-background border-2 border-primary shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                       POOL_PAGE: {previewPage}
                    </div>
                    <Button 
                       variant="outline" 
                       disabled={!previewData?.has_more || isPreviewLoading}
                       onClick={() => handlePreview(previewFile!, previewPage + 1)}
                       className="rounded-none border-2 border-border h-12 font-black gap-3 uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all px-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                       NEXT <ChevronRight className="w-5 h-5" />
                    </Button>
                 </div>
                 
                 <div className="flex items-center gap-10">
                    <div className="text-right hidden md:block">
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Format_Identifier</p>
                       <p className="text-sm font-mono font-black text-primary uppercase border-b-2 border-primary inline-block">{previewData?.type || "unknown"}</p>
                    </div>
                    <Button 
                       onClick={() => previewFile && handleDownload(previewFile)}
                       className="rounded-none h-14 px-12 font-black tracking-[0.3em] uppercase bg-primary text-primary-foreground border-2 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                       <Download className="w-5 h-5 mr-3" /> EXPORT_FULL_DATA
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* SYNC MODAL */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full max-w-lg border-4 border-cyan-500 rounded-none shadow-[16px_16px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden bg-background">
              {/* Header */}
              <div className="bg-cyan-950/80 border-b-4 border-cyan-500/30 p-6 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <CloudUpload className="w-6 h-6 text-cyan-400 animate-pulse" />
                    <div>
                       <h2 className="text-xl font-black italic uppercase tracking-tighter text-cyan-400">Cloud_Sync_Manager</h2>
                       <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest font-bold">
                         MANUAL_STORAGE_UPLOADS
                       </p>
                    </div>
                 </div>
                 <Button 
                    variant="ghost" 
                    disabled={isSyncing}
                    onClick={() => {
                      setIsSyncModalOpen(false);
                      setSyncProgress(null);
                    }} 
                    className="hover:bg-cyan-500/20 text-cyan-400 rounded-none h-10 w-10 p-0 transition-colors border border-cyan-500/30"
                 >
                    <X className="w-5 h-5" />
                 </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar font-mono text-xs text-foreground">
                 {/* Progress or status info */}
                 {syncProgress && (
                    <div className="p-3 border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-[11px] rounded-none animate-pulse flex items-center gap-2">
                       <Loader2 className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
                       <span>{syncProgress}</span>
                    </div>
                 )}

                 {/* List of files */}
                 {selectedProject?.files.filter(f => !f.synced).length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                       <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                       <p className="font-bold text-emerald-400 uppercase tracking-wider text-xs">ALL_FILES_SYNCD_TO_CLOUD</p>
                       <p className="text-[10px] text-muted-foreground uppercase">No new or unsynced files detected in this folder.</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       <div className="flex items-center justify-between border-b border-border pb-2 text-[10px] text-muted-foreground font-black uppercase">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                             <input 
                               type="checkbox"
                               className="accent-cyan-500 h-4 w-4 bg-background border-2 border-border"
                               checked={
                                 (selectedProject?.files.filter(f => !f.synced) || []).length > 0 &&
                                 selectedSyncFiles.length === (selectedProject?.files.filter(f => !f.synced) || []).length
                               }
                               onChange={(e) => {
                                 const unsynced = selectedProject?.files.filter(f => !f.synced) || [];
                                 if (e.target.checked) {
                                   setSelectedSyncFiles(unsynced.map(f => f.id));
                                 } else {
                                   setSelectedSyncFiles([]);
                                 }
                                 setSyncProgress(null);
                               }}
                               disabled={isSyncing}
                             />
                             <span>SELECT_ALL</span>
                          </label>
                          <span>{selectedSyncFiles.length} OF {(selectedProject?.files.filter(f => !f.synced) || []).length} SELECTED</span>
                       </div>
                       
                       <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                          {(selectedProject?.files.filter(f => !f.synced) || []).map((file) => (
                             <div 
                                key={file.id} 
                                className="flex items-center justify-between p-2.5 border border-border/60 bg-card/40 hover:bg-card/80 hover:border-cyan-500/30 transition-colors"
                             >
                                <label className="flex items-center gap-3 truncate cursor-pointer select-none flex-1">
                                   <input 
                                     type="checkbox"
                                     className="accent-cyan-500 h-4 w-4 bg-background border-2 border-border"
                                     checked={selectedSyncFiles.includes(file.id)}
                                     onChange={(e) => {
                                       if (e.target.checked) {
                                         setSelectedSyncFiles([...selectedSyncFiles, file.id]);
                                       } else {
                                         setSelectedSyncFiles(selectedSyncFiles.filter(id => id !== file.id));
                                       }
                                       setSyncProgress(null);
                                     }}
                                     disabled={isSyncing}
                                   />
                                   <span className="truncate text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">{file.name}</span>
                                </label>
                                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{formatSize(file.size_bytes)}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              {/* Action buttons */}
              <div className="p-6 bg-card border-t border-border/80 flex justify-end gap-3 shrink-0">
                 <Button
                    variant="ghost"
                    onClick={() => {
                      setIsSyncModalOpen(false);
                      setSyncProgress(null);
                    }}
                    disabled={isSyncing}
                    className="rounded-none border border-border h-10 font-bold uppercase tracking-widest text-[11px]"
                 >
                    CANCEL
                 </Button>
                 {(selectedProject?.files.filter(f => !f.synced) || []).length > 0 && (
                    <Button
                       onClick={handleSyncSelected}
                       disabled={isSyncing || selectedSyncFiles.length === 0}
                       className="rounded-none h-10 px-6 font-bold uppercase tracking-widest text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 shadow-[4px_4px_0px_rgba(6,182,212,0.2)]"
                    >
                       {isSyncing ? (
                          <>
                             <Loader2 className="w-4 h-4 animate-spin text-white" /> SYNCING...
                          </>
                       ) : (
                          <>
                             <CloudUpload className="w-4 h-4" /> SYNC_SELECTED
                          </>
                       )}
                    </Button>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
