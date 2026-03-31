/**
 * Supabase 테스트 사용자 생성 스크립트
 * 실행: node scripts/create-test-user.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = 'https://cwnzezlgtcqkmnyojhbd.supabase.co';
const key = 'sb_publishable_bi9fT4Tmp5uApJ36ASeSSA_DHUFBwJQ';

const supabase = createClient(url, key);

async function main() {
  // 1. 회원가입
  const { data, error } = await supabase.auth.signUp({
    email: 'test@test.com',
    password: 'testtest',
    options: {
      data: { name: '테스트사용자' },
    },
  });

  if (error) {
    console.error('❌ 회원가입 실패:', error.message);
    // 이미 존재하는 경우 로그인 시도
    if (error.message.includes('already') || error.status === 422) {
      console.log('→ 이미 존재하는 계정, 로그인 시도...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'testtest',
      });
      if (loginError) {
        console.error('❌ 로그인도 실패:', loginError.message);
        process.exit(1);
      }
      console.log('✅ 기존 계정 로그인 성공:', loginData.user?.id);
    }
    return;
  }

  console.log('✅ 테스트 계정 생성 성공');
  console.log('   User ID:', data.user?.id);
  console.log('   Email:', data.user?.email);

  // 2. profiles 테이블에 프로필 생성 (트리거가 없는 경우 수동)
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        name: '테스트사용자',
        is_admin: false,
      });
    if (profileError) {
      console.log('⚠️ 프로필 생성 참고:', profileError.message);
    } else {
      console.log('✅ 프로필 생성 완료');
    }
  }
}

main();
