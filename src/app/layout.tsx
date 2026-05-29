import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '실시간 전자 방명록',
  description: '사진과 그림으로 남기는 실시간 방명록',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
