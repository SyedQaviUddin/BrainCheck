import '../index.css';

export const metadata = {
  title: 'BrainCheck - Mental Fatigue Detection',
  description: 'Detect mental fatigue through keystroke dynamics analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
