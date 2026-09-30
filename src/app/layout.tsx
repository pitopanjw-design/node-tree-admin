import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "노드 구매자 추천 계보도 시각화 대시보드",
  description: "XNOT 노드 구매자 및 추천인 네트워크 계보 시각화 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark h-full">
      <body className="h-full w-full overflow-hidden bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
