"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  Panel,
  Node,
  Edge,
} from "@xyflow/react";
import {
  Search,
  UserPlus,
  Upload,
  RotateCcw,
  Maximize2,
  Users,
  Server,
  Layers,
  X,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Info,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { CustomMemberNode } from "../components/CustomMemberNode";
import {
  Member,
  CustomNodeData,
  getLayoutedElements,
  INITIAL_SAMPLE_MEMBERS,
  NODE_WIDTH,
  NODE_HEIGHT,
  formatAddress,
} from "../utils/layout";

const STORAGE_KEY = "xnot_node_tree_members_v1";

const nodeTypes = {
  customMember: CustomMemberNode,
};

function FlowDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // 회원 등록 폼 상태
  const [newMember, setNewMember] = useState({
    name: "",
    address: "",
    referrerAddress: "",
    nodeCount: 1,
  });
  const [formError, setFormError] = useState("");

  // CSV 모달 상태
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { setCenter, fitView } = useReactFlow();

  // 토스트 메시지 헬퍼
  const showToast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 1. localStorage 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // JSON parse 에러 시 샘플 데이터 사용
    }
    setMembers(INITIAL_SAMPLE_MEMBERS);
    setIsLoaded(true);
  }, []);

  // 2. 레이아웃 재계산 및 노드/엣지 동기화
  const updateLayout = useCallback(
    (currentMembers: Member[], targetHighlight?: string | null) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        currentMembers,
        targetHighlight !== undefined ? targetHighlight : highlightedAddress
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    },
    [highlightedAddress, setNodes, setEdges]
  );

  useEffect(() => {
    if (!isLoaded) return;
    updateLayout(members, highlightedAddress);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch {
      // localStorage 저장 에러 방어
    }
  }, [members, highlightedAddress, isLoaded, updateLayout]);

  // 첫 렌더링 시 전체 화면 맞춤
  useEffect(() => {
    if (isLoaded && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 600 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 결과 목록
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.address.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // 노드 포커스 이동 (setCenter)
  const focusNode = useCallback(
    (address: string) => {
      const lowerAddr = address.trim().toLowerCase();
      setHighlightedAddress(lowerAddr);
      setIsSearchDropdownOpen(false);

      const targetNode = nodes.find((n) => n.id.toLowerCase() === lowerAddr);
      if (targetNode) {
        const x = targetNode.position.x + NODE_WIDTH / 2;
        const y = targetNode.position.y + NODE_HEIGHT / 2;
        setCenter(x, y, { zoom: 1.2, duration: 800 });
        showToast(`'${targetNode.data.member.name}' 노드로 이동했습니다.`, "info");
      } else {
        showToast("해당 노드를 찾을 수 없습니다.", "error");
      }
    },
    [nodes, setCenter, showToast]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchResults.length > 0) {
      focusNode(searchResults[0].address);
    } else if (searchQuery.trim()) {
      showToast("일치하는 회원 또는 지갑주소가 없습니다.", "error");
    }
  };

  // 회원 단건 등록
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const name = newMember.name.trim();
    const address = newMember.address.trim();
    const referrerAddress = newMember.referrerAddress.trim();
    const nodeCount = Number(newMember.nodeCount);

    if (!name) {
      setFormError("회원 이름을 입력해주세요.");
      return;
    }
    if (!address) {
      setFormError("지갑 주소를 입력해주세요.");
      return;
    }
    if (isNaN(nodeCount) || nodeCount < 1) {
      setFormError("구매 노드 수는 1개 이상이어야 합니다.");
      return;
    }

    const lowerAddr = address.toLowerCase();
    if (members.some((m) => m.address.toLowerCase() === lowerAddr)) {
      setFormError("이미 등록된 지갑 주소입니다.");
      return;
    }

    if (referrerAddress && referrerAddress.toLowerCase() === lowerAddr) {
      setFormError("본인의 주소를 추천인으로 지정할 수 없습니다.");
      return;
    }

    if (
      referrerAddress &&
      !members.some((m) => m.address.toLowerCase() === referrerAddress.toLowerCase())
    ) {
      setFormError("입력한 추천인 주소가 현재 등록된 회원 목록에 존재하지 않습니다.");
      return;
    }

    const created: Member = {
      name,
      address,
      referrerAddress,
      nodeCount,
    };

    const nextMembers = [...members, created];
    setMembers(nextMembers);
    setIsAddModalOpen(false);
    setNewMember({ name: "", address: "", referrerAddress: "", nodeCount: 1 });
    showToast(`'${name}' 회원이 성공적으로 등록되었습니다.`, "success");

    // 새로 등록된 노드로 포커스 이동
    setTimeout(() => {
      focusNode(address);
    }, 200);
  };

  // CSV 파싱 및 등록
  const handleCsvImport = () => {
    setCsvError("");
    if (!csvText.trim()) {
      setCsvError("CSV 내용을 입력하거나 파일을 업로드해 주세요.");
      return;
    }

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setCsvError("파싱할 수 있는 데이터가 없습니다.");
      return;
    }

    const newParsedList: Member[] = [];
    const existingMap = new Map(members.map((m) => [m.address.toLowerCase(), m]));
    let successCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 헤더 라인 건너뛰기
      if (
        i === 0 &&
        (line.toLowerCase().includes("address") ||
          line.toLowerCase().includes("name") ||
          line.toLowerCase().includes("이름"))
      ) {
        continue;
      }

      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length < 2) continue;

      const [name, address, referrerAddress = "", nodeCountStr = "1"] = cols;
      if (!name || !address) continue;

      const nodeCount = parseInt(nodeCountStr, 10) || 1;
      const memberObj: Member = {
        name,
        address,
        referrerAddress: referrerAddress || "",
        nodeCount,
      };

      existingMap.set(address.toLowerCase(), memberObj);
      newParsedList.push(memberObj);
      successCount++;
    }

    if (successCount === 0) {
      setCsvError("유효한 회원 데이터 행을 찾을 수 없습니다. 형식을 확인해 주세요.");
      return;
    }

    const updated = Array.from(existingMap.values());
    setMembers(updated);
    setIsCsvModalOpen(false);
    setCsvText("");
    showToast(`총 ${successCount}건의 데이터가 성공적으로 반영되었습니다.`, "success");
    setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 200);
  };

  // CSV 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const csvContent =
      "name,address,referrerAddress,nodeCount\n" +
      "홍길동,0x1111111111111111111111111111111111111111,,10\n" +
      "이순신,0x2222222222222222222222222222222222222222,0x1111111111111111111111111111111111111111,5\n" +
      "강감찬,0x3333333333333333333333333333333333333333,0x1111111111111111111111111111111111111111,3\n";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "xnot_node_members_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 샘플 데이터 복원
  const handleResetSample = () => {
    if (confirm("초기 샘플 데이터로 복원하시겠습니까? 현재 입력된 데이터는 대체됩니다.")) {
      setMembers(INITIAL_SAMPLE_MEMBERS);
      setHighlightedAddress(null);
      setSearchQuery("");
      showToast("샘플 데이터로 복원되었습니다.", "info");
      setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 150);
    }
  };

  // 전체 데이터 삭제
  const handleClearAll = () => {
    if (confirm("모든 회원 데이터를 삭제하시겠습니까?")) {
      setMembers([]);
      setHighlightedAddress(null);
      setSearchQuery("");
      showToast("모든 데이터가 삭제되었습니다.", "info");
    }
  };

  // 통계 계산
  const totalMembers = members.length;
  const totalNodes = members.reduce((sum, m) => sum + (Number(m.nodeCount) || 0), 0);
  const rootMembers = members.filter((m) => !m.referrerAddress).length;

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col select-none">
      {/* 상단 통합 네비게이션 헤더 */}
      <header className="z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-lg shrink-0">
        {/* 로고 및 서비스 타이틀 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              XNOT 노드 구매자 계보도
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Live Viewer
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              추천인 네트워크 및 노드 보유 현황 계층 시각화
            </p>
          </div>
        </div>

        {/* 대시보드 통계 배지 */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <Users className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <span className="text-slate-400">총 회원: </span>
              <span className="font-bold text-slate-200">{totalMembers}명</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <Server className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-slate-400">총 구매 노드: </span>
              <span className="font-bold text-emerald-300">{totalNodes}개</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <span className="text-slate-400">마스터 노드: </span>
              <span className="font-bold text-amber-300">{rootMembers}개</span>
            </div>
          </div>
        </div>

        {/* 상단 검색창 */}
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="회원 이름 또는 지갑 주소 검색 (0x...)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setHighlightedAddress(null);
                  setIsSearchDropdownOpen(false);
                }}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* 검색 드롭다운 결과 */}
          {isSearchDropdownOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
              {searchResults.length > 0 ? (
                searchResults.map((member) => (
                  <button
                    key={member.address}
                    type="button"
                    onClick={() => focusNode(member.address)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 border-b border-slate-800 last:border-0 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-100 truncate">
                        {member.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate">
                        {formatAddress(member.address, 10, 6)}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">
                      {member.nodeCount} Nodes
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">
                  일치하는 회원이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>회원 등록</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>CSV 일괄 업로드</span>
          </button>

          <button
            onClick={() => fitView({ padding: 0.2, duration: 600 })}
            title="화면 중앙 맞춤"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetSample}
            title="샘플 데이터로 복원"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* React Flow 메인 캔버스 */}
      <div className="flex-1 w-full h-full relative" onClick={() => setIsSearchDropdownOpen(false)}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{ type: "smoothstep" }}
          proOptions={{ hideAttribution: true }}
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            nodeStrokeColor="#4f46e5"
            nodeColor="#312e81"
            nodeBorderRadius={4}
            maskColor="rgba(15, 23, 42, 0.75)"
          />

          {/* 하단 좌측 안내 패널 */}
          <Panel position="top-left" className="!m-4 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1 shadow-xl">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>계보도 안내</span>
              </div>
              <div>• 마우스 휠: 확대/축소 | 드래그: 캔버스 이동</div>
              <div>• 노드 카드의 복사 버튼 클릭 시 지갑주소 복사</div>
              {highlightedAddress && (
                <div className="text-indigo-400 font-medium pt-1">
                  선택된 노드 연결선 강조 활성화됨
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* 알림 토스트 */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl border backdrop-blur-md text-xs font-semibold transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-indigo-950/90 border-indigo-500/50 text-indigo-200"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toastMessage.type === "info" && <Info className="w-4 h-4 text-indigo-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. 회원 단건 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">회원 단건 등록</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  회원 이름 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  본인 지갑 주소 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={newMember.address}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  추천인 지갑 주소{" "}
                  <span className="text-slate-400 font-normal">(비워둘 시 최상위 마스터 노드)</span>
                </label>
                <input
                  type="text"
                  placeholder="0x... (선택 사항)"
                  value={newMember.referrerAddress}
                  onChange={(e) =>
                    setNewMember({ ...newMember, referrerAddress: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {members.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto py-1">
                    <span className="text-[10px] text-slate-500 shrink-0">빠른 선택:</span>
                    {members.slice(0, 3).map((m) => (
                      <button
                        key={m.address}
                        type="button"
                        onClick={() =>
                          setNewMember({ ...newMember, referrerAddress: m.address })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 truncate max-w-[120px]"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  구매 노드 수 (개) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newMember.nodeCount}
                  onChange={(e) =>
                    setNewMember({ ...newMember, nodeCount: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CSV 일괄 업로드 모달 */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">CSV 일괄 업로드 및 파싱</h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {csvError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* 안내 및 템플릿 다운로드 */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="space-y-0.5 text-slate-300">
                  <div className="font-semibold text-slate-200">CSV 헤더 포맷 규격</div>
                  <div className="font-mono text-[11px] text-indigo-400">
                    name,address,referrerAddress,nodeCount
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 text-[11px] font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>템플릿 다운로드</span>
                </button>
              </div>

              {/* 파일 업로드 인풋 */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>CSV 파일 선택하기</span>
                </button>
              </div>

              {/* 텍스트 직접 입력 / 미리보기 */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  CSV 내용 직접 붙여넣기 또는 미리보기
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`name,address,referrerAddress,nodeCount\n김철수,0x1111...,,20\n이영희,0x2222...,0x1111...,10`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>전체 초기화</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={handleCsvImport}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30"
                  >
                    가져오기 및 트리 반영
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ReactFlowProvider>
      <FlowDashboard />
    </ReactFlowProvider>
  );
}
