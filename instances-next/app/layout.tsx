import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Amazon EC2 Instance Comparison',
  description: 'A free and easy-to-use tool for comparing EC2 Instance features and prices.',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
