import Link from 'next/link';

export const metadata = {
  title: '이용약관 | FortuneTab',
  description: 'FortuneTab 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
          {/* 헤더 */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <Link href="/" className="text-lg font-black text-[#1e1b4b]">fortunetab</Link>
            <h1 className="mt-4 text-2xl font-black text-gray-900">이용약관</h1>
            <p className="mt-1.5 text-sm text-gray-400">마지막 업데이트: 2026년 1월 1일</p>
          </div>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-8">

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (목적)</h2>
              <p className="text-gray-600">
                본 약관은 FortuneTab(이하 "서비스")이 제공하는 사주·운세 기반 PDF 플래너 서비스의 이용 조건 및 절차,
                회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (정의)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>"서비스"란 FortuneTab이 제공하는 PDF 플래너 제작·다운로드·발송 서비스를 의미합니다.</li>
                <li>"이용자"란 서비스에 접속하여 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 의미합니다.</li>
                <li>"디지털 콘텐츠"란 서비스를 통해 제공되는 PDF 파일 형태의 플래너 상품을 의미합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
              <p className="text-gray-600">
                본 약관은 서비스 화면에 게시하거나 이용자에게 공지함으로써 효력이 발생합니다.
                서비스는 관련 법령에 위배되지 않는 범위에서 약관을 개정할 수 있으며,
                개정 시 적용일자 및 개정 사유를 명시하여 사전에 공지합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (서비스 이용 조건)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>서비스는 만 14세 이상 이용자에게 제공됩니다.</li>
                <li>회원 가입 시 실명 및 유효한 이메일 주소를 입력하여야 합니다.</li>
                <li>타인의 정보를 도용하거나 허위 정보로 가입하는 행위는 금지됩니다.</li>
                <li>하나의 이메일 주소로 하나의 계정만 생성할 수 있습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (디지털 상품 결제 및 환불 정책)</h2>
              <p className="text-gray-600 mb-3">
                서비스에서 판매하는 상품은 디지털 콘텐츠(PDF 파일)로, 아래 환불 정책이 적용됩니다.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 font-medium text-xs mb-2">환불 불가 원칙</p>
                <ul className="text-amber-700 text-xs space-y-1 list-disc pl-4">
                  <li>PDF 파일이 이메일로 발송된 이후에는 환불이 불가합니다.</li>
                  <li>사주 맞춤 플래너는 제작이 시작된 이후 환불이 불가합니다.</li>
                  <li>다운로드가 완료된 무료 플래너는 환불 대상이 아닙니다.</li>
                </ul>
              </div>
              <p className="text-gray-600 mt-3">
                단, 서비스 오류·결함으로 인해 정상적인 상품을 제공받지 못한 경우에는
                결제일로부터 7일 이내에 fortunetab@gmail.com으로 문의하시면 검토 후 환불 처리합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (저작권 및 지식재산권)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>서비스에서 제공하는 PDF 플래너의 디자인·레이아웃·콘텐츠의 저작권은 FortuneTab에 귀속됩니다.</li>
                <li>이용자는 구매한 PDF 플래너를 개인적 용도로만 사용할 수 있습니다.</li>
                <li>상업적 목적으로의 재배포, 수정·복제·판매 행위는 엄격히 금지됩니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (서비스 제공의 중단)</h2>
              <p className="text-gray-600">
                서비스는 시스템 정기 점검, 설비 보수 또는 불가항력적 사유로 인해 일시적으로 서비스 제공을
                중단할 수 있습니다. 이 경우 사전 공지를 원칙으로 하되, 긴급한 경우에는 사후 통지할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (면책 조항)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>사주·운세 콘텐츠는 오락·참고 목적으로만 제공되며, 실제 결과를 보장하지 않습니다.</li>
                <li>이용자의 귀책 사유로 발생한 손해에 대해 서비스는 책임을 지지 않습니다.</li>
                <li>이용자가 서비스 내 게시물을 통해 얻은 정보로 인한 손해에 대해 서비스는 책임을 지지 않습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제9조 (분쟁 해결)</h2>
              <p className="text-gray-600">
                서비스 이용과 관련한 분쟁은 대한민국 법률에 따르며, 관할 법원은 서비스 운영자의 주소지를 관할하는
                법원으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">문의</h2>
              <p className="text-gray-600">
                이용약관에 관한 문의는{' '}
                <a href="mailto:fortunetab@gmail.com" className="text-indigo-600 hover:text-indigo-800 underline">
                  fortunetab@gmail.com
                </a>
                으로 연락해 주세요.
              </p>
            </section>

          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 text-sm">
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline transition-colors">
              개인정보처리방침 보기
            </Link>
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
