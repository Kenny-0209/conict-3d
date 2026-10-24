export const privacyPolicy=Object.freeze({version:'2026-10-25.1',effectiveDate:'2026년 10월 25일',retentionDays:30,contact:'conict526@gmail.com'});
export function deletionDeadline(now=new Date()){
 if(!Number.isFinite(now.getTime()))throw new Error('올바른 접수 시각이 필요합니다.');
 return new Date(now.getTime()+privacyPolicy.retentionDays*24*60*60*1000);
}
export function koreanTimestamp(date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date)+' (한국시간)'}
const contactLink=`<a href="mailto:${privacyPolicy.contact}">${privacyPolicy.contact}</a>`;
export function collectionNotice(){return `<dl class="letter-notice-list">
 <dt>처리자·문의처</dt><dd>CONICT 건축 ICT연구실 편지 접수 담당자 · ${contactLink}</dd>
 <dt>이용 목적</dt><dd>본인 구분 및 회신, 상담 일정 조율과 상담 진행, 문의 답변, 연구 참여 의사 확인 및 안내. 홍보 발송이나 별도 인재 명단 작성에는 사용하지 않습니다.</dd>
 <dt>필수 항목</dt><dd>이름, 학년, 회신 이메일, 이야기 종류와 해당 편지 내용. 상담은 상담 주제·희망 일정, 문의는 질문, 연구 참여는 동기·관심 분야를 포함합니다. 아직 정하지 않은 동기·분야는 탐색 중으로 답할 수 있습니다.</dd>
 <dt>선택 항목</dt><dd>학번(동명이인 구분 및 학생 여부 확인용). 별도 선택 동의를 한 경우에만 전달하며, 비워두거나 동의하지 않아도 편지를 보낼 수 있습니다.</dd>
 <dt>접수 기록</dt><dd>접수 시각, 동의 여부·안내 버전. 전송 사업자는 전송·보안 처리 과정에서 IP 주소, 브라우저 정보, 요청 시각 등 기술 정보를 처리할 수 있습니다.</dd>
 <dt>보유·이용 기간</dt><dd><strong>회신·상담·참여 안내가 끝나 목적을 달성하면 지체 없이 삭제하며, 늦어도 접수 시각부터 30일 이내에 삭제합니다.</strong> 계속 상담이 필요하면 만료 전에 새 기간과 목적을 안내하고 다시 동의를 받습니다. 회신하지 않거나 참여하지 않은 경우도 30일을 넘기지 않습니다.</dd>
 <dt>거부 권리·영향</dt><dd>필수 수집·이용 동의를 거부할 수 있습니다. 거부하면 이 온라인 편지 전송과 이메일 회신을 이용할 수 없지만, 사이트 열람과 연구실 방문 상담은 가능합니다. 학번 동의 거부는 전송에 영향을 주지 않습니다.</dd>
 </dl>`}
export function transferNotice(){return `<p>편지를 보내면 Formspree를 거쳐 연구실 Gmail로 전달됩니다. 다음 사업자가 접수·전달·메일 보관 업무를 처리합니다.</p>
 <dl class="letter-notice-list">
 <dt>이전 항목</dt><dd>위 수집 항목 중 실제 작성·동의하여 보내는 내용, 이메일 및 전송·동의 기록. 전송 과정에서 IP·요청 시각 등 기술 정보가 처리될 수 있습니다.</dd>
 <dt>이전 시점·방법</dt><dd>‘편지 보내기’를 누를 때 HTTPS로 Formspree에 전송하고, 연구실 메일로 전달합니다. 회신·상담 중에는 메일 송수신 및 보관 과정에서 처리됩니다.</dd>
 <dt>접수·전달 사업자</dt><dd><b>Formspree, Inc. / 미국(AWS 호스팅)</b><br>연락처: <a href="mailto:team@formspree.io">team@formspree.io</a><br>목적: 폼 접수, 스팸 차단, 연구실 메일 전달. 제출 원문을 보관하는 Submission Archive는 꺼두었습니다. 전송 처리·보안 로그·백업의 정확한 삭제기간은 공개 자료에서 확정되지 않았으며 사업자 정책이 적용됩니다.</dd>
 <dt>메일 사업자</dt><dd><b>Google LLC / 미국 소재 사업자, 전 세계 분산 서버</b><br>연락처: <a href="mailto:googlekrsupport@google.com">googlekrsupport@google.com</a><br>목적: 연구실 Gmail 수신·회신·보관. Google은 전 세계 서버에서 처리할 수 있다고 안내하며, 이 개인용 Gmail의 개별 저장·처리 국가를 지정하거나 확인할 수 없습니다. 미국에만 보관된다고 보장하지 않습니다.</dd>
 <dt>보유·삭제</dt><dd>연구실이 관리하는 원문·회신·동의 기록은 목적 달성 시 지체 없이, 접수부터 최대 30일 내 삭제합니다. Gmail 휴지통의 해당 메일까지 영구 삭제합니다. Google의 서버 삭제 절차는 통상 약 2개월이며 암호화 백업은 최대 6개월 남을 수 있다고 안내합니다. 법령·보안상 보존 예외와 사업자 로그는 각 정책에 따릅니다. 연구실의 30일 기준이 사업자 모든 시스템의 물리적 삭제 완료를 보장하는 것은 아닙니다.</dd>
 <dt>거부 방법·영향</dt><dd>국외 이전 동의를 선택하지 않으면 전송하지 않습니다. 전송 후에는 ${contactLink}로 철회·삭제 또는 이전 중지를 요청할 수 있습니다. 거부하면 이 온라인 편지 전송과 메일 상담을 이용할 수 없지만, 사이트 열람과 연구실 방문 상담은 가능합니다. 직접 Gmail로 이메일을 보내는 것도 Google을 통한 국외 처리를 수반합니다.</dd>
 </dl><p class="letter-provider-links"><a href="https://formspree.io/security/" target="_blank" rel="noopener noreferrer">Formspree 보안·처리 국가 ↗</a> · <a href="https://formspree.io/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Formspree 개인정보 정책 ↗</a><br><a href="https://policies.google.com/privacy?hl=ko" target="_blank" rel="noopener noreferrer">Google 개인정보 정책 ↗</a> · <a href="https://policies.google.com/technologies/retention?hl=ko" target="_blank" rel="noopener noreferrer">Google 삭제·보관 정책 ↗</a></p>`}
export function deletionNotice(){return `<h2>삭제와 권리 행사</h2><p>담당자가 상담·회신의 종료 또는 동의 철회를 확인하면 보관할 필요가 없어진 개인정보를 지체 없이 삭제합니다. 미처리 건도 접수 후 최대 30일을 넘기지 않습니다. 별도의 법률상 보존 의무가 실제로 적용되는 경우에만 근거·대상·기간을 안내하고 다른 자료와 분리하여 보관합니다.</p><p>전자 자료는 원문과 답장, 첨부파일 및 별도 저장본을 포함해 삭제합니다. Gmail에서는 휴지통으로 옮기는 데서 끝내지 않고 해당 메일을 영구 삭제합니다. 출력물은 파쇄합니다. 신규 편지는 Formspree 제출 보관함에 원문을 쌓지 않도록 설정했습니다.</p><p>열람·정정·삭제·처리정지·동의 철회는 ${contactLink}로 요청해주세요. 답장받은 이메일과 접수 시기 등 최소 정보로 본인 여부를 확인하고 법정 절차에 따라 처리합니다. 주민등록번호나 신분증 사본은 보내지 마세요.</p><p>이 페이지는 입력 내용을 브라우저 영구 저장소에 저장하지 않으며, 공개 웹페이지·GitHub 저장소·이슈에 편지를 게시하지 않습니다. 전송 전에는 화면 메모리에만 남고, 새로고침·닫기 시 사라집니다. 건강·주민등록번호 등 민감하거나 불필요한 정보, 타인의 개인정보는 편지에 적지 마세요.</p><p><b>삭제는 연구실 담당자가 수행합니다.</b> 메일에 삭제기한이 표시되지만, 현재 자동 삭제 프로그램은 연결되어 있지 않습니다.</p>`}
export function consentHTML(a={}){return `<section class="letter-privacy-block" aria-label="개인정보 안내와 동의"><div class="letter-privacy-summary"><b>이야기가 끝나면 지울게요.</b><p>회신·상담이 끝나면 지체 없이, 접수 후 <strong>최대 30일 이내</strong> 삭제해요. 연구실 메일로만 전달하며 공개 게시하지 않아요.</p></div>
 <details class="letter-privacy"><summary>개인정보 수집·이용 안내 자세히 보기</summary>${collectionNotice()}</details>
 <label class="letter-consent"><input type="checkbox" id="letter-consent" data-consent="consent" ${a.consent===true?'checked':''}><span><b>[필수] 개인정보 수집·이용에 동의해요.</b></span></label>
 ${a.studentId?.trim()?`<div class="letter-optional-consent"><label class="letter-consent"><input type="checkbox" id="letter-student-consent" data-consent="studentIdConsent" ${a.studentIdConsent===true?'checked':''}><span><b>[선택] 학번 수집·이용에 동의해요.</b><small>동명이인 구분·학생 여부 확인에 사용하고 위와 같은 기간 내 삭제해요. 동의하지 않으면 학번을 빼고 보내요.</small></span></label></div>`:''}
 <details class="letter-privacy"><summary>국외 이전 안내 자세히 보기</summary>${transferNotice()}</details>
 <p class="letter-transfer-summary">Formspree(미국) → 연구실 Gmail(Google의 전 세계 서버)로 전달돼요. 사업자의 로그·백업에는 별도 삭제기간이 적용돼요. Gmail의 개별 처리 국가는 지정되지 않아요.</p>
 <label class="letter-consent"><input type="checkbox" id="letter-overseas-consent" data-consent="overseasConsent" ${a.overseasConsent===true?'checked':''}><span><b>[필수] 위 국외 이전 안내를 확인하고 동의해요.</b></span></label>
 <p class="letter-privacy-foot">동의는 각각 선택해주세요. 필수 동의를 거부하면 편지를 전송하지 않으며, 사이트 열람·방문 상담은 가능해요. <a href="./privacy.html" target="_blank" rel="noopener">전체 안내·삭제 요청 방법 ↗</a><br>안내 버전 ${privacyPolicy.version}</p></section>`}
