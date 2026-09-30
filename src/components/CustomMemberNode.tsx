"use client";

import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Check, Copy, User, Server, Network } from "lucide-react";
import { CustomNodeData, formatAddress } from "../utils/layout";

function CustomMemberNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const member = nodeData.member;
  const isHighlighted = nodeData.isHighlighted || selected;
  const directCount = nodeData.directReferralsCount || 0;

  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member.address) return;
    navigator.clipboard.writeText(member.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMaster = !member.referrerAddress;

  return (
    <div
      className={`relative w-[260px] rounded-xl transition-all duration-300 backdrop-blur-md ${
        isHighlighted
          ? "ring-4 ring-indigo-500/80 shadow-2xl scale-[1.03] border-indigo-400"
          : "hover:scale-[1.02] hover:shadow-xl"
      } ${
        isMaster
          ? "bg-gradient-to-br from-amber-950/90 via-slate-900/95 to-slate-900/95 border-2 border-amber-500/70 shadow-amber-900/30"
          : "bg-slate-900/90 border border-slate-700/80 shadow-lg shadow-black/40"
      }`}
    >
      {/* 상단 타겟 핸들 (부모로부터 연결) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 !-top-1.5 transition-colors hover:!bg-indigo-300"
      />

      <div className="p-3.5 flex flex-col gap-2.5 text-slate-100">
        {/* 상단 헤더: 회원 이름 & 노드 수 배지 */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isMaster
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-indigo-500/20 text-indigo-400"
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="truncate font-semibold text-sm text-slate-100" title={member.name}>
              {member.name}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
              isMaster
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
            title={`구매 노드: ${member.nodeCount}개`}
          >
            <Server className="w-3 h-3" />
            <span>{member.nodeCount} Nodes</span>
          </div>
        </div>

        {/* 지갑 주소 및 복사 버튼 */}
        <div className="flex items-center justify-between bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Wallet Address
            </span>
            <span
              className="font-mono text-xs text-slate-200 tracking-tight select-all truncate"
              title={member.address}
            >
              {formatAddress(member.address, 6, 4)}
            </span>
          </div>

          <button
            onClick={handleCopy}
            type="button"
            aria-label="지갑 주소 복사"
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-100 transition-colors ml-1 shrink-0 relative group"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-slate-950 text-[10px] text-slate-200 px-1.5 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap pointer-events-none">
              {copied ? "복사됨!" : "주소 복사"}
            </span>
          </button>
        </div>

        {/* 하단 메타 정보 (추천인 여부 & 하위 추천 수) */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-1 truncate" title={member.referrerAddress || "최상위 노드"}>
            <span className="text-slate-500">추천:</span>
            <span className="text-slate-300 truncate max-w-[100px]">
              {member.referrerAddress ? formatAddress(member.referrerAddress, 4, 3) : "최상위(Root)"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-300 font-medium shrink-0">
            <Network className="w-3 h-3 text-indigo-400" />
            <span>하위 {directCount}명</span>
          </div>
        </div>
      </div>

      {/* 하단 소스 핸들 (자식으로 연결) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 !-bottom-1.5 transition-colors hover:!bg-indigo-300"
      />
    </div>
  );
}

export const CustomMemberNode = memo(CustomMemberNodeComponent);
