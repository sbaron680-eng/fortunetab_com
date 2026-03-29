import Link from 'next/link';

export const metadata = {
  title: '환불정책 | FortuneTab',
  description: 'FortuneTab 서비스 환불 및 취소 정책',
};

export default function RefundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">

          {/* 헤더 */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <Link href="/" className="text-lg font-black text-ft-ink">fortunetab</Link>
            <h1 className="mt-4 text-2xl font-black text-gray-900">환불정책</h1>
            <p className="mt-1.5 text-sm text-gray-400">마지막 업데이트: 2026년 3월 20일</p>
          </div>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-8">

            {/* 디지털 콘텐츠 안내 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-amber-800 mb-2">📌 디지털 콘텐츠 구매 전 필독</h2>
              <p className="text-amber-700 text-xs leading-relaxed">
                FortuneTab에서 판매하는 모든 상품은 <strong>PDF 형태의 디지털 콘텐츠</strong>입니다.
                「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라,
                디지털 콘텐츠의 경우 제공이 개시된 이후에는 청약철회가 제한될 수 있습니다.
              </p>
            </div>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (서비스 제공 기간)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2.5 text-left font-semibold text-gray-700">구분</th>
                      <th className="border border-gray-200 px-4 py-2.5 text-left font-semibold text-gray-700">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2.5 font-medium text-gray-700">PDF 배송 기간</td>
                      <td className="border border-gray-200 px-4 py-2.5 text-gray-600">
                        결제 완료 후 <strong>자동 생성 후 수분 내</strong> 이메일 발송<br />
                        <span className="text-gray-400">(24시간 자동 처리, 주말·공휴일 포함)</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="border border-gray-200 px-4 py-2.5 font-medium text-gray-700">서비스 최대 제공 기간</td>
                      <td className="border border-gray-200 px-4 py-2.5 text-gray-600">
                        PDF 발송일로부터 <strong>30일</strong><br />
                        <span className="text-gray-400">(다운로드 링크 유효 기간 기준)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2.5 font-medium text-gray-700">무료 공통 플래너</td>
                      <td className="border border-gray-200 px-4 py-2.5 text-gray-600">
                        결제 없이 브라우저에서 즉시 다운로드 가능 (기간 제한 없음)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (취소 및 환불 원칙)</h2>
              <div className="space-y-3 text-gray-600">
                <div className="flex gap-3">
                  <span className="text-red-500 flex-shrink-0 font-bold">✗</span>
                  <div>
                    <p className="font-medium text-gray-800">환불 불가 사유</p>
                    <ul className="mt-1.5 space-y-1 text-gray-600 list-disc pl-4">
                      <li>PDF 파일이 이메일로 발송된 이후</li>
                      <li>PDF 다운로드 링크를 클릭·열람한 이후</li>
                      <li>개인 맞춤 제작이 시작된 이후 (사주 분석 착수 후)</li>
                      <li>단순 변심, 구매 실수의 경우</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-500 flex-shrink-0 font-bold">✓</span>
                  <div>
                    <p className="font-medium text-gray-800">환불 가능 사유</p>
                    <ul className="mt-1.5 space-y-1 text-gray-600 list-disc pl-4">
                      <li>결제 후 PDF 발송 전에 취소 요청한 경우 (발송 착수 전에 한함)</li>
                      <li>서비스 오류로 인해 PDF가 정상 제공되지 않은 경우 (발송일로부터 7일 이내 접수)</li>
                      <li>주문한 상품과 다른 파일이 발송된 경우</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (취소 절차)</h2>
              <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                <li>
                  고객센터 이메일(<a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">sbaron680@gmail.com</a>)로
                  주문번호, 이름, 연락처, 취소 사유를 보내주세요.
                </li>
                <li>운영자가 내용 확인 후 환불 가능 여부를 안내드립니다.</li>
                <li>환불이 결정된 경우, <strong>결제 수단으로 3~5 영업일 이내</strong> 환불 처리됩니다.</li>
              </ol>
              <p className="mt-3 text-xs text-gray-400">
                ※ 취소 접수 후 제작이 이미 시작된 경우에는 환불이 불가할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (재발송 정책)</h2>
              <p className="text-gray-600">
                발송된 PDF 파일에 오류(파일 손상, 열람 불가, 잘못된 파일 발송)가 있는 경우,
                발송일로부터 <strong>7일 이내</strong>에 고객센터로 접수하시면 재발송해 드립니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (소비자 보호)</h2>
              <p className="text-gray-600">
                본 환불정책은 「전자상거래 등에서의 소비자보호에 관한 법률」,
                「콘텐츠산업 진흥법」을 준수합니다. 본 정책에서 정하지 않은 사항은 관련 법령 및
                공정거래위원회 고시를 따릅니다.
              </p>
              <p className="mt-3 text-gray-600">
                소비자 분쟁 발생 시 한국소비자원({' '}
                <a
                  href="https://www.kca.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ft-ink underline"
                >
                  www.kca.go.kr
                </a>
                ) 또는 전자문서·전자거래분쟁조정위원회를 통해 해결을 요청할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">문의</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-gray-600 space-y-1">
                <p>📧 이메일: <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">sbaron680@gmail.com</a></p>
                <p>⏰ 운영시간: 평일 10:00 – 18:00 (주말·공휴일 제외)</p>
                <p>🏢 상호: 비포에이 | 통신판매업신고: 제 2019-울산울주-0053호</p>
              </div>
            </section>

          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">개인정보 처리방침</Link>
            <Link href="/" className="hover:text-gray-600 transition-colors">← 홈으로</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
