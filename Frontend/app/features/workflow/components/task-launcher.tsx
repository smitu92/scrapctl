import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Badge } from "~/components/ui/badge"
import api from "~/../axios"
import Papa from "papaparse"
import { useWorkflowStore } from "../store/workflow-store"
const autoSelectColumn = (headers: string[], op: string): string => {
  if (!headers || headers.length === 0) return "";
  const lowercaseOp = (op || "").toLowerCase();
  
  if (lowercaseOp.includes("productlist") || lowercaseOp.includes("category")) {
    // Expected input is Category IDs
    const idKeywords = ["id", "category_id", "categoryid", "cat_id", "catid", "category"];
    for (const key of idKeywords) {
      const found = headers.find(h => h.toLowerCase() === key);
      if (found) return found;
    }
    for (const key of idKeywords) {
      const found = headers.find(h => h.toLowerCase().includes(key));
      if (found) return found;
    }
  } else {
    // Expected input is Product URLs
    const urlKeywords = ["url", "product_url", "link", "href"];
    for (const key of urlKeywords) {
      const found = headers.find(h => h.toLowerCase() === key);
      if (found) return found;
    }
    for (const key of urlKeywords) {
      const found = headers.find(h => h.toLowerCase().includes(key));
      if (found) return found;
    }
  }
  return headers[0];
};

const getRecommendedMetadata = (op: string) => {
  const lowercaseOp = (op || "").toLowerCase();
  const isCategory = lowercaseOp.includes("productlist") || lowercaseOp.includes("category");
  return {
    type: isCategory ? "CATEGORY_ID" : "PRODUCT_URL",
    headers: isCategory ? "ID | CATEGORY_ID | CAT_ID" : "URL | PRODUCT_URL | LINK"
  };
};

export function TaskLauncher() {
  const { resetStats } = useWorkflowStore()
  const [targetSite, setTargetSite] = useState("croma")
  const [opMode, setOpMode] = useState("")
  
  // Project & Path Settings
  const [projectName, setProjectName] = useState("Croma_Extraction")
  const [outDirType, setOutDirType] = useState("standard") // standard | custom
  const [customOutDir, setCustomOutDir] = useState("./output/custom_run")
  
  const [workers, setWorkers] = useState("5")
  const [azureKey, setAzureKey] = useState(import.meta.env.VITE_CROMA_AZURE_KEY || "")
  const [isLaunching, setIsLaunching] = useState(false)
  const [useLocalIp, setUseLocalIp] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem("use_local_ip") === "true"
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem("use_local_ip", String(useLocalIp))
  }, [useLocalIp])
  
  // Registry state
  const [registry, setRegistry] = useState<any>({})
  const [executionType, setExecutionType] = useState<"async" | "sync">("async")
  
  // Input states
  const [inputType, setInputType] = useState("raw_list") // raw_list | device_upload_csv | device_upload_txt
  const [inputDataText, setInputDataText] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [fileName, setFileName] = useState("")
  const [selectedFileId, setSelectedFileId] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [targetColumn, setTargetColumn] = useState("")
  
  // Params states
  const [params, setParams] = useState<any>({ limit: "10", delay: "1.5", maxRetries: "3" })

  // New folder selection states
  const [availableFolders, setAvailableFolders] = useState<any[]>([])
  const [recentFolders, setRecentFolders] = useState<any[]>([])

  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch folders and registry
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await api.get("/api/projects")
        setAvailableFolders(res.data)
        
        // Load recent from localStorage
        const recent = JSON.parse(localStorage.getItem("recent_projects") || "[]")
        setRecentFolders(recent)
      } catch (err) {
        console.error("Failed to fetch folders", err)
      }
    }
    fetchFolders()
  }, [])

  // Fetch headers when project file is selected
  useEffect(() => {
    if (inputType === "project_file" && selectedFileId) {
      const fetchHeaders = async () => {
        try {
          const res = await api.get(`/api/projects/preview/${selectedFileId}?page=1&page_size=1`);
          if (res.data.headers) {
            setCsvColumns(res.data.headers);
            const bestCol = autoSelectColumn(res.data.headers, opMode);
            if (bestCol) setTargetColumn(bestCol);
          }
        } catch (err) {
          console.error("Failed to fetch headers", err);
        }
      };
      fetchHeaders();
    }
  }, [selectedFileId, inputType, opMode])

  // Recalibrate target data column when operation mode changes
  useEffect(() => {
    if (csvColumns.length > 0 && opMode) {
      const bestCol = autoSelectColumn(csvColumns, opMode);
      if (bestCol) setTargetColumn(bestCol);
    }
  }, [opMode, csvColumns])

  // Fetch registry when target changes
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const res = await api.get(`/api/task/registry/${targetSite}`)
        const reg = res.data.registry || {}
        setRegistry(reg)
        
        // Default to first async mode if available
        const asyncOp = Object.keys(reg).find(key => key.toLowerCase().includes("async") || key === "Categories")
        if (asyncOp) {
          setExecutionType("async")
          setOpMode(asyncOp)
        } else {
          const firstOp = Object.keys(reg)[0]
          if (firstOp) {
            setExecutionType(firstOp.toLowerCase().includes("async") || firstOp === "Categories" ? "async" : "sync")
            setOpMode(firstOp)
          }
        }
      } catch (err) {
        console.error("Failed to load registry", err)
      }
    }
    fetchRegistry()
  }, [targetSite])

  const handleTabChange = (type: "async" | "sync") => {
    setExecutionType(type);
    const filteredKeys = Object.keys(registry).filter(key => {
      const isAsync = key.toLowerCase().includes("async") || key === "Categories";
      return type === "async" ? isAsync : !isAsync;
    });
    if (filteredKeys.length > 0) {
      setOpMode(filteredKeys[0]);
    }
  };

  const activeRecipe = registry[opMode]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      setFileContent(content)
      
      if (file.name.endsWith(".csv")) {
        setInputType("device_upload_csv")
        Papa.parse(content, {
          header: true,
          preview: 5,
          complete: (results) => {
            if (results.meta.fields) {
              setCsvColumns(results.meta.fields)
              const bestCol = autoSelectColumn(results.meta.fields, opMode);
              if (bestCol) setTargetColumn(bestCol);
            }
          }
        })
      } else {
        setInputType("device_upload_txt")
      }
    }
    reader.readAsText(file)
  }

  const handleLaunch = async () => {
    resetStats()
    setIsLaunching(true)
    try {
      let finalOutDir = ""
      let selectedProjectName = projectName

      if (outDirType === "standard") {
        finalOutDir = `./output/${projectName}_${new Date().getTime()}`
      } else if (outDirType === "custom") {
        finalOutDir = customOutDir
      } else if (outDirType.startsWith("proj_")) {
        const projId = outDirType.replace("proj_", "")
        const proj = availableFolders.find(p => p.id === projId)
        if (proj) {
          finalOutDir = proj.path
          selectedProjectName = proj.name
        }
      } else if (outDirType.startsWith("recent_")) {
        const recentPath = outDirType.replace("recent_", "")
        const recent = recentFolders.find(r => r.path === recentPath)
        if (recent) {
          finalOutDir = recent.path
          selectedProjectName = recent.name
        }
      }

      // Save to recent
      const newRecent = [
        { id: outDirType, name: selectedProjectName, path: finalOutDir },
        ...recentFolders.filter(r => r.path !== finalOutDir)
      ].slice(0, 5)
      localStorage.setItem("recent_projects", JSON.stringify(newRecent))

      const payload: any = {
        target: targetSite,
        task_type: opMode,
        input_type: activeRecipe?.needs_input ? inputType : "raw_list",
        input_data: inputType === "raw_list" ? inputDataText.split('\n').filter(Boolean) : [],
        file_content: fileContent,
        target_column: targetColumn,
        params: { 
          workers: parseInt(workers) || 5,
          max_retries: parseInt(params.maxRetries) || 3
        },
        use_proxies: !useLocalIp,
        azure_key: azureKey,
        output_path: finalOutDir,
        project_file_id: inputType === "project_file" ? selectedFileId : undefined
      }
      
      if (activeRecipe?.accepted_params?.includes("limit")) payload.params.limit = parseInt(params.limit)
      if (activeRecipe?.accepted_params?.includes("delay")) payload.params.delay = parseFloat(params.delay)

      const res = await api.post("/api/task/execute", payload)
      if (res.data.session_id) {
        navigate(`/monitor?sessionId=${res.data.session_id}`)
      } else {
        alert(res.data.error + ": " + res.data.details)
      }
    } catch (err: any) {
      alert("Failed to initialize scraping engine: " + (err.response?.data?.details || err.message))
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Universal Task Launcher</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm tracking-wide">CONFIG_MODE: <span className="text-primary">ADMIN_OVERRIDE</span></p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Cluster Status</p>
              <p className="text-xs font-mono font-bold text-emerald-500">READY_FOR_DEPLOYMENT</p>
           </div>
           <div className="w-12 h-12 border-2 border-primary flex items-center justify-center bg-primary/5">
              <div className="w-3 h-3 bg-primary animate-pulse" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* STEP 1: TARGET */}
          <Card className="border-2 rounded-none shadow-none border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
              <span className="text-6xl font-black italic">01</span>
            </div>
            <CardHeader className="bg-card border-b-2 border-border rounded-none py-4">
              <CardTitle className="uppercase flex items-center gap-2 text-md font-bold tracking-widest">
                Target Node & Operation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Target Site</label>
                <Select value={targetSite} onValueChange={setTargetSite}>
                  <SelectTrigger className="rounded-none border-2 h-12 bg-background hover:bg-muted/50 transition-colors">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2">
                    <SelectItem value="croma">Croma Electronics (Test Target)</SelectItem>
                    <SelectItem value="blinkit" disabled>Blinkit (Soon)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="border-2 border-border/40 bg-muted/20 p-3 mt-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
                  <span className="text-foreground font-bold">Target Context:</span> Croma (India's biggest electronic retail chain) is taken as an example. Right now, the system works specifically with Croma because our internal scraper engine logic is built on the Croma API structure. In future phases, we will expand this to support any website dynamically. For further details on this roadmap, visit our <a href="/feedback" className="text-primary hover:underline font-bold">Survey & Roadmap page</a>.
                </div>
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Select Category / Operation</label>
                <div className="border-2 border-border bg-card/30 p-4 space-y-4">
                  {/* Execution Mode Tabs */}
                  <div className="flex gap-2 bg-background p-1 border border-border">
                    <Button
                      type="button"
                      variant={executionType === "async" ? "default" : "secondary"}
                      className="rounded-none font-black tracking-tighter text-[10px] h-9 flex-1 cursor-pointer"
                      onClick={() => handleTabChange("async")}
                    >
                      ⚡ Async Loop
                    </Button>
                    <Button
                      type="button"
                      variant={executionType === "sync" ? "default" : "secondary"}
                      className="rounded-none font-black tracking-tighter text-[10px] h-9 flex-1 cursor-pointer"
                      onClick={() => handleTabChange("sync")}
                    >
                      Threaded Sync
                    </Button>
                  </div>

                  {/* Category Selection Dropdown */}
                  <Select value={opMode} onValueChange={setOpMode}>
                    <SelectTrigger className="rounded-none border-2 h-12 bg-background">
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2">
                      {Object.keys(registry)
                        .filter(key => {
                          const isAsync = key.toLowerCase().includes("async") || key === "Categories";
                          return executionType === "async" ? isAsync : !isAsync;
                        })
                        .map(key => (
                          <SelectItem key={key} value={key} className="font-mono text-xs uppercase">
                            {registry[key].label.replace(/\s*\(Async\)|\s*\(Sync\)/i, "")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {activeRecipe && (
                 <div className="md:col-span-2 bg-muted/30 p-4 border-l-4 border-primary">
                    <p className="text-xs text-muted-foreground italic">{activeRecipe.description}</p>
                 </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: INPUT */}
          {activeRecipe?.needs_input && (
            <Card className="border-2 rounded-none shadow-none border-primary/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <span className="text-6xl font-black italic">02</span>
              </div>
              <CardHeader className="bg-card border-b-2 border-border rounded-none py-4">
                <CardTitle className="uppercase flex items-center gap-2 text-md font-bold tracking-widest">
                  Payload Configuration
                </CardTitle>
                <CardDescription className="font-mono text-[10px]">{activeRecipe.input_hint}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex gap-1">
                  <Button 
                    variant={inputType === "raw_list" ? "default" : "secondary"} 
                    className="rounded-none font-bold tracking-tighter text-[10px] h-8 flex-1" 
                    onClick={() => setInputType("raw_list")}
                  >
                    RAW_TEXT
                  </Button>
                  <Button 
                    variant={(inputType === "device_upload_csv" || inputType === "device_upload_txt") ? "default" : "secondary"} 
                    className="rounded-none font-bold tracking-tighter text-[10px] h-8 flex-1" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    UPLOAD_DEVICE
                  </Button>
                  <Button 
                    variant={inputType === "project_file" ? "default" : "secondary"} 
                    className="rounded-none font-bold tracking-tighter text-[10px] h-8 flex-1" 
                    onClick={() => setInputType("project_file")}
                  >
                    PROJECT_REF
                  </Button>
                  <input type="file" className="hidden" ref={fileInputRef} accept=".csv,.txt" onChange={handleFileUpload} />
                </div>
                
                {inputType === "raw_list" ? (
                  <textarea 
                    value={inputDataText}
                    onChange={(e) => setInputDataText(e.target.value)}
                    className="w-full h-40 p-4 bg-muted/20 border-2 border-border font-mono text-sm focus:outline-none focus:border-primary resize-none placeholder:opacity-30"
                    placeholder={`Enter ${activeRecipe.input_label} (one per line)...`}
                  />
                ) : inputType === "project_file" ? (
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Project</label>
                           <Select value={selectedProjectId} onValueChange={(val) => {
                             setSelectedProjectId(val);
                             setSelectedFileId("");
                           }}>
                              <SelectTrigger className="rounded-none border-2 h-10 bg-background">
                                 <SelectValue placeholder="CHOOSE_PROJECT..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-2">
                                 {availableFolders.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name.toUpperCase()}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select File</label>
                           <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                              <SelectTrigger className="rounded-none border-2 h-10 bg-background">
                                 <SelectValue placeholder="CHOOSE_FILE..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-2">
                                 {availableFolders.find(p => p.id === selectedProjectId)?.files.map((f: any) => (
                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                 )) || <div className="p-4 text-center text-[10px] italic">No files in project</div>}
                              </SelectContent>
                           </Select>
                        </div>
                     </div>
                     {selectedFileId && (selectedFileId.toLowerCase().includes(".csv") || csvColumns.length > 0) && (
                        <div className="bg-muted/30 p-4 border-2 border-border border-dashed space-y-4 animate-in slide-in-from-top-2 duration-200">
                           <div className="max-w-xs space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Data Column</label>
                              <Select value={targetColumn} onValueChange={setTargetColumn}>
                                 <SelectTrigger className="rounded-none border-2 h-10 bg-background">
                                    <SelectValue placeholder="SELECT_COLUMN..." />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-none border-2">
                                    {csvColumns.map(col => (
                                       <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                    {csvColumns.length === 0 && <div className="p-2 text-[10px] italic">No columns found</div>}
                                 </SelectContent>
                              </Select>
                           </div>
                           {(() => {
                             const meta = getRecommendedMetadata(opMode);
                             return (
                               <div className="border-2 border-border bg-background p-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground space-y-1.5">
                                 <div className="flex justify-between border-b border-border/20 pb-1">
                                   <span>EXPECTED_INPUT_TYPE</span>
                                   <span className="text-primary font-black">{meta.type}</span>
                                 </div>
                                 <div className="flex justify-between">
                                   <span>SUGGESTED_CSV_HEADERS</span>
                                   <span className="text-foreground font-black">{meta.headers}</span>
                                 </div>
                               </div>
                             );
                           })()}
                           <p className="text-[9px] font-mono text-muted-foreground italic">Note: The system will extract values from the selected column to use as inputs.</p>
                        </div>
                     )}
                  </div>
                ) : (
                  <div className="space-y-6 border-2 border-dashed border-border p-8 text-center bg-muted/5">
                    {fileName ? (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center">
                          <Badge className="rounded-none bg-emerald-500 hover:bg-emerald-500 mb-2">{fileName.split('.').pop()?.toUpperCase()}</Badge>
                          <p className="font-mono text-sm font-bold">{fileName}</p>
                        </div>
                        {inputType === "device_upload_csv" && csvColumns.length > 0 && (
                          <div className="max-w-xs mx-auto space-y-2 text-left pt-4 border-t border-border">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Data Column</label>
                            <Select value={targetColumn} onValueChange={setTargetColumn}>
                              <SelectTrigger className="rounded-none border-2 bg-background h-10">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-2">
                                {csvColumns.map(col => (
                                  <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(() => {
                              const meta = getRecommendedMetadata(opMode);
                              return (
                                <div className="border-2 border-border bg-background p-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground space-y-1.5 mt-4">
                                  <div className="flex justify-between border-b border-border/20 pb-1">
                                    <span>EXPECTED_INPUT_TYPE</span>
                                    <span className="text-primary font-black">{meta.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>SUGGESTED_CSV_HEADERS</span>
                                    <span className="text-foreground font-black">{meta.headers}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-50">
                        <p className="text-xs uppercase font-bold tracking-widest">No File Selected</p>
                        <p className="text-[10px] font-mono">Select a CSV or TXT file to proceed</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* STEP 3: SIDEBAR SETTINGS */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-none shadow-none border-primary bg-background sticky top-6">
            <CardHeader className="bg-primary text-primary-foreground rounded-none py-4 border-b-2 border-primary">
              <CardTitle className="uppercase text-sm font-black tracking-[0.2em]">Deployment Specs</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Project Directory Selection */}
              <div className="space-y-4 border-b border-border pb-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Execution Context</label>
                    <Select value={outDirType} onValueChange={setOutDirType}>
                      <SelectTrigger className="rounded-none border-2 h-10 font-mono text-[11px] bg-background">
                        <SelectValue placeholder="Select context" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 max-h-[300px]">
                        {recentFolders.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-[9px] font-black uppercase tracking-widest text-primary/50">Recent_Sessions</SelectLabel>
                            {recentFolders.map((r, i) => (
                              <SelectItem key={`recent-${i}`} value={`recent_${r.path}`} className="text-[11px] font-mono">
                                {r.name}
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}
                        
                        <SelectGroup>
                          <SelectLabel className="text-[9px] font-black uppercase tracking-widest text-primary/50">Active_Projects</SelectLabel>
                          {availableFolders.map((proj) => (
                            <SelectItem key={proj.id} value={`proj_${proj.id}`} className="text-[11px] font-mono">
                              {proj.name.toUpperCase()}
                            </SelectItem>
                          ))}
                          {availableFolders.length === 0 && (
                            <div className="px-2 py-4 text-[10px] text-muted-foreground italic text-center">No projects found</div>
                          )}
                        </SelectGroup>

                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel className="text-[9px] font-black uppercase tracking-widest text-primary/50">Initialization_Logic</SelectLabel>
                          <SelectItem value="standard" className="text-[11px] font-mono italic">NEW_STANDARD_PROJECT</SelectItem>
                          <SelectItem value="custom" className="text-[11px] font-mono italic">CUSTOM_ABSOLUTE_PATH</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                 </div>

                 {outDirType === "standard" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Project Name</label>
                      <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                      <p className="text-[9px] text-muted-foreground italic font-mono">Path: ./output/{projectName}_[timestamp]/</p>
                    </div>
                 ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Absolute Path</label>
                      <Input value={customOutDir} onChange={(e) => setCustomOutDir(e.target.value)} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                    </div>
                 )}
              </div>
              
              <div className="space-y-2 border-b border-border pb-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Mode</label>
                    <Badge variant={useLocalIp ? "outline" : "default"} className="text-[9px] rounded-none py-0 h-4">
                        {useLocalIp ? "LOCAL_IP" : "PROXY_FLEET"}
                    </Badge>
                  </div>
                  <Button 
                    variant="secondary" 
                    className={`w-full rounded-none h-10 font-bold text-xs border-2 ${useLocalIp ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-primary/20'}`}
                    onClick={() => setUseLocalIp(!useLocalIp)}
                  >
                    {useLocalIp ? "SWITCH TO PROXY FLEET" : "USE LOCAL IP (DEBUG)"}
                  </Button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Azure / Croma Key</label>
                <Input type="password" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} className="rounded-none border-2 font-mono text-xs h-10 bg-background" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Concurrency</label>
                  <Input type="number" value={workers} onChange={(e) => setWorkers(e.target.value)} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                </div>
                {activeRecipe?.accepted_params?.includes("limit") && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item Limit</label>
                    <Input type="number" value={params.limit} onChange={(e) => setParams({...params, limit: e.target.value})} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                  </div>
                )}
              </div>

              {(activeRecipe?.accepted_params?.includes("delay") || activeRecipe?.accepted_params?.includes("max_retries")) && (
                <div className="grid grid-cols-2 gap-4">
                  {activeRecipe?.accepted_params?.includes("delay") && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inter-task Delay (s)</label>
                      <Input type="number" step="0.1" value={params.delay} onChange={(e) => setParams({...params, delay: e.target.value})} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                    </div>
                  )}
                  {activeRecipe?.accepted_params?.includes("max_retries") && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max Retries</label>
                      <Input type="number" value={params.maxRetries} onChange={(e) => setParams({...params, maxRetries: e.target.value})} className="rounded-none border-2 font-mono text-sm h-10 bg-background" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button 
                onClick={handleLaunch} 
                disabled={isLaunching || !opMode}
                className="w-full rounded-none py-8 text-md tracking-[0.3em] font-black group flex flex-col items-center justify-center relative overflow-hidden bg-primary hover:bg-primary/90 transition-all"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">{isLaunching ? "INITIALIZING..." : "EXECUTE TASK"}</span>
                {!isLaunching && <span className="text-[10px] mt-1 opacity-50 relative z-10 font-mono tracking-widest">VERSION_2.0_STABLE</span>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
