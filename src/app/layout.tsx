import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界杯赛事预测",
  description: "实时赛果 + 大模型赛前预测与复盘",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="bg-pitch text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              ⚽ 世界杯预测
            </Link>
            <nav className="flex flex-1 gap-4 text-sm">
              <Link href="/" className="hover:underline">
                赛程
              </Link>
              <Link href="/review" className="hover:underline">
                预测复盘
              </Link>
              <Link href="/logs" className="ml-auto hover:underline">
                日志
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
