import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | FortuneTab',
  description: 'FortuneTab 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
          {/* 헤더 */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <Link href="/" className="text-lg font-black text-[#1e1b4b]">fortunetab</Link>
            <h1 className="mt-4 text-2xl font-black text-gray-900">개인정보처리방침</h1>
            <p className="mt-1.5 text-sm text-gray-400">마지막 업데이트: 2026년 1월 1일</p>
          </div>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-8">

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (개인정보의 처리 목적)</h2>
              <p className="text-gray-600">
                FortuneTab(이하 "서비스")은 다음의 목적으로 개인정보를 처리합니다.
                처리된 개인정보는 아래 목적 이외의 용도로는 사용되지 않으며,
                이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행합니다.
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-5 mt-3">
                <li>회원 가입 및 본인 확인</li>
                <li>PDF 플래너 서비스 제공 및 이메일 발송</li>
                <li>사주 맞춤 플래너 제작</li>
                <li>주문 처리 및 결제 확인</li>
                <li>고객 문의 응대 및 분쟁 처리</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (수집하는 개인정보 항목)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-600 border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">구분</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">수집 항목</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">필수 여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">회원 가입</td>
                      <td className="px-4 py-3">이름, 이메일 주소, 비밀번호(암호화)</td>
                      <td className="px-4 py-3">필수</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">주문 · 결제</td>
                      <td className="px-4 py-3">이름, 이메일 주소, 연락처(휴대폰 번호)</td>
                      <td className="px-4 py-3">필수</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">사주 서비스</td>
                      <td className="px-4 py-3">생년월일, 출생 시간, 성별</td>
                      <td className="px-4 py-3">필수 (해당 상품 구매 시)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">자동 수집</td>
                      <td className="px-4 py-3">접속 IP, 브라우저 정보, 서비스 이용 기록</td>
                      <td className="px-4 py-3">자동 수집</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>
                  <span className="font-medium text-gray-700">회원 정보:</span>{' '}
                  서비스 이용 종료(탈퇴) 후 1년. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 보존.
                </li>
                <li>
                  <span className="font-medium text-gray-700">주문·결제 정보:</span>{' '}
                  전자상거래 등에서의 소비자보호에 관한 법률에 따라 5년 보존.
                </li>
                <li>
                  <span className="font-medium text-gray-700">사주 정보:</span>{' '}
                  플래너 제작 완료 후 1년. 이용자 요청 시 즉시 삭제.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-800 font-medium text-xs">
                  FortuneTab은 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                </p>
              </div>
              <p className="text-gray-600 mt-3">
                단, 다음의 경우는 예외입니다.
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-5 mt-2">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (개인정보 처리 위탁)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-600 border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">수탁 업체</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">위탁 업무</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3">Supabase, Inc.</td>
                      <td className="px-4 py-3">회원 인증 및 데이터베이스 저장</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3">Cloudflare, Inc.</td>
                      <td className="px-4 py-3">웹 서비스 호스팅 및 CDN</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">토스페이먼츠(주)</td>
                      <td className="px-4 py-3">결제 처리</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (이용자의 권리)</h2>
              <p className="text-gray-600 mb-3">이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리 정지 요구</li>
              </ul>
              <p className="text-gray-600 mt-3">
                권리 행사는{' '}
                <a href="mailto:sbaron680@gmail.com" className="text-indigo-600 hover:text-indigo-800 underline">
                  sbaron680@gmail.com
                </a>
                으로 요청할 수 있으며, 요청 후 10일 이내에 처리합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (개인정보 보호를 위한 기술적·관리적 조치)</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>비밀번호는 암호화(bcrypt)되어 저장됩니다.</li>
                <li>개인정보 전송 시 TLS/SSL 암호화 통신을 사용합니다.</li>
                <li>개인정보에 대한 접근 권한을 최소화합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (개인정보 관리 책임자)</h2>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-gray-700">
                <p className="font-semibold text-[#1e1b4b] mb-2">개인정보 관리 책임자</p>
                <p>서비스명: FortuneTab</p>
                <p>
                  이메일:{' '}
                  <a href="mailto:sbaron680@gmail.com" className="text-indigo-600 hover:text-indigo-800 underline">
                    sbaron680@gmail.com
                  </a>
                </p>
              </div>
              <p className="text-gray-600 mt-3">
                개인정보 관련 문의, 불만 처리, 피해 구제 등에 관한 사항은 위 연락처로 문의해 주세요.
              </p>
            </section>

          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 text-sm">
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline transition-colors">
              이용약관 보기
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
