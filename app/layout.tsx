import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '연관 키워드 그래프 MVP',
  description: '국내 중심 + 해외 확장 키워드 네트워크 시각화'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
