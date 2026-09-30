import dagre from "dagre";
import { Node, Edge, Position } from "@xyflow/react";

export interface Member {
  name: string;
  address: string;
  referrerAddress: string;
  nodeCount: number;
}

export interface CustomNodeData extends Record<string, unknown> {
  member: Member;
  isHighlighted?: boolean;
  totalTeamNodes?: number;
  directReferralsCount?: number;
}

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 140;

/**
 * dagre 그래프 라이브러리를 사용하여 Top-to-Bottom(TB) 계층 트리 레이아웃 좌표를 계산합니다.
 */
export function getLayoutedElements(
  members: Member[],
  highlightedAddress?: string | null
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: "TB",
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  // 유효한 회원 주소 Set 생성 (추천인 유효성 검증용)
  const memberAddressSet = new Set(
    members.map((m) => m.address.trim().toLowerCase())
  );

  // 팀 전체 노드 수 및 직속 추천인 수 계산 헬퍼
  const directReferralMap = new Map<string, number>();
  members.forEach((m) => {
    const ref = m.referrerAddress.trim().toLowerCase();
    if (ref && memberAddressSet.has(ref)) {
      directReferralMap.set(ref, (directReferralMap.get(ref) || 0) + 1);
    }
  });

  // 1. 노드 등록
  members.forEach((member) => {
    dagreGraph.setNode(member.address.toLowerCase(), {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // 2. 엣지 등록 및 Edge 리스트 생성
  const edges: Edge[] = [];
  members.forEach((member) => {
    const targetAddr = member.address.trim().toLowerCase();
    const sourceAddr = member.referrerAddress.trim().toLowerCase();

    // 추천인 주소가 존재하고, 실제 멤버 목록에 있으며, 자기 자신이 아닐 때
    if (sourceAddr && sourceAddr !== targetAddr && memberAddressSet.has(sourceAddr)) {
      dagreGraph.setEdge(sourceAddr, targetAddr);

      const isConnectedToHighlight =
        highlightedAddress &&
        (highlightedAddress.toLowerCase() === targetAddr ||
          highlightedAddress.toLowerCase() === sourceAddr);

      edges.push({
        id: `e-${sourceAddr}-${targetAddr}`,
        source: sourceAddr,
        target: targetAddr,
        type: "smoothstep",
        animated: Boolean(isConnectedToHighlight),
        style: {
          stroke: isConnectedToHighlight ? "#6366f1" : "#94a3b8",
          strokeWidth: isConnectedToHighlight ? 2.5 : 1.8,
        },
      });
    }
  });

  // 3. 레이아웃 계산 실행
  dagre.layout(dagreGraph);

  // 4. 계산된 좌표로 React Flow 노드 생성
  const nodes: Node<CustomNodeData>[] = members.map((member) => {
    const lowerAddr = member.address.trim().toLowerCase();
    const nodeWithPosition = dagreGraph.node(lowerAddr) || { x: 0, y: 0 };
    const isHighlighted =
      highlightedAddress?.toLowerCase() === lowerAddr;

    return {
      id: lowerAddr,
      type: "customMember",
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: {
        member,
        isHighlighted: Boolean(isHighlighted),
        directReferralsCount: directReferralMap.get(lowerAddr) || 0,
      },
    };
  });

  return { nodes, edges };
}

/**
 * 지갑 주소를 0x12...34 형태로 축약합니다.
 */
export function formatAddress(address: string, front = 6, back = 4): string {
  if (!address) return "";
  const trimmed = address.trim();
  if (trimmed.length <= front + back + 3) return trimmed;
  return `${trimmed.slice(0, front)}...${trimmed.slice(-back)}`;
}

/**
 * 기본 초기 샘플 회원 데이터셋
 */
export const INITIAL_SAMPLE_MEMBERS: Member[] = [
  {
    name: "Master Node (본사/마스터)",
    address: "0xGenesisMaster0000000000000000000001",
    referrerAddress: "",
    nodeCount: 50,
  },
  {
    name: "김철수 (Alpha Leader)",
    address: "0x1A4b8893dCe17B9F1230000000000000000002",
    referrerAddress: "0xGenesisMaster0000000000000000000001",
    nodeCount: 20,
  },
  {
    name: "이영희 (Beta Leader)",
    address: "0x2B7c99A4eDf28C0A2340000000000000000003",
    referrerAddress: "0xGenesisMaster0000000000000000000001",
    nodeCount: 15,
  },
  {
    name: "박민수",
    address: "0x3C8dAAB5fE039D1B3450000000000000000004",
    referrerAddress: "0x1A4b8893dCe17B9F1230000000000000000002",
    nodeCount: 8,
  },
  {
    name: "최지우",
    address: "0x4D9eBBC6aF14AE2C4560000000000000000005",
    referrerAddress: "0x1A4b8893dCe17B9F1230000000000000000002",
    nodeCount: 12,
  },
  {
    name: "정다은",
    address: "0x5E0fCCD7b025BF3D5670000000000000000006",
    referrerAddress: "0x2B7c99A4eDf28C0A2340000000000000000003",
    nodeCount: 5,
  },
  {
    name: "강호동",
    address: "0x6F1aDDE8c136C04E6780000000000000000007",
    referrerAddress: "0x3C8dAAB5fE039D1B3450000000000000000004",
    nodeCount: 3,
  },
  {
    name: "유재석",
    address: "0x7A2bEEF9d247D15F7890000000000000000008",
    referrerAddress: "0x4D9eBBC6aF14AE2C4560000000000000000005",
    nodeCount: 10,
  },
];
