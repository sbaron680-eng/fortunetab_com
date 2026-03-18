import Link from 'next/link';

export const metadata = {
  title: '404 — 페이지를 찾을 수 없습니다',
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 bg-[#f8f8fc]">
      {/* 아이콘 */}
      <div className="text-6xl mb-6 select-none" aria-hidden="true">
        🔮
      </div>

      {/* 404 숫자 */}
      <h1 className="text-[7rem] sm:text-[9rem] font-black leading-none text-[#1e1b4b] opacity-10 select-none">
        404
      </h1>

      {/* 메인 메시지 */}
      <div className="-mt-6 sm:-mt-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1e1b4b] mb-3">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-[#4b5563] text-base sm:text-lg max-w-md mx-auto leading-relaxed">
          요청하신 페이지가 존재하지 않거나,<br className="hidden sm:block" />
          이미 삭제된 페이지입니다. ✨
        </p>
      </div>

      {/* 구분선 */}
      <div className="mt-10 mb-8 w-16 h-px bg-[#4338ca] opacity-30" />

      {/* 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#1e1b4b] text-white text-sm font-semibold hover:bg-[#312e81] transition-colors"
        >
          🏠 홈으로 돌아가기
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border-2 border-[#1e1b4b] text-[#1e1b4b] text-sm font-semibold hover:bg-[#1e1b4b] hover:text-white transition-colors"
        >
          ✨ 상품 보러가기
        </Link>
      </div>
    </div>
  );
}
