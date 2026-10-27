/* HTTP responses are mocked: this suite sends no customer data or notifications. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let mode='failure',release;const requests=[];
 await page.route('https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/workbook-submit',async route=>{
  const b=route.request().postDataJSON();requests.push(b);
  if(mode==='hold')await new Promise(r=>release=r);
  if(mode==='failure')return route.fulfill({status:503,json:{ok:false,error:'unavailable'}});
  if(mode==='malformed')return route.fulfill({status:200,body:'not a receipt'});
  if(mode==='rate')return route.fulfill({status:429,json:{ok:false,error:'rate_limited'}});
  return route.fulfill({status:202,json:{ok:true,submission_id:b.submission_id}});
 });
 await page.goto((process.env.WORKBOOK_URL||'http://127.0.0.1:8793')+'/fthb/payment.html');
 assert.equal(await page.locator('.guided-question').count(),5);assert.equal(await page.locator('[data-exercise],.exercise-index,details.drill').count(),0);
 assert.equal(await page.locator('[data-answer="breathing_room.figure"]').count(),1);
 assert.equal(await page.locator('details.comparison[open]').count(),0);
 const data={};
 for(const input of await page.locator('[data-answer]').all()){
  const key=await input.getAttribute('data-answer');const type=await input.getAttribute('type');const tag=await input.evaluate(n=>n.tagName);
  if(type==='checkbox'){await input.check();data[key]=true;}
  else if(tag==='SELECT'){const val=key==='guided.priority'?'lower_payment':key==='guided.remaining.comfort'?'not_sure':key.endsWith('.taxes')?'included':key.endsWith('.hoa_dues')?'not_applicable':'separate';await input.selectOption(val);data[key]=val;}
  else {if(key.startsWith('guided.comparison.option_'))await page.locator('details.comparison').evaluate(n=>n.open=true);const val=key==='question'?'<img src=x onerror=alert(1)>':key==='breathing_room.figure'?'not sure':`Answer ${key}`;await input.fill(val);data[key]=val;}
 }
 await page.locator('details.comparison').evaluate(n=>n.open=false);
 await page.evaluate(()=>{window.print=()=>{dispatchEvent(new Event('beforeprint'));dispatchEvent(new Event('beforeprint'));};});
 await page.locator('#print-workbook').click();await page.emulateMedia({media:'print'});
 for(const mirror of await page.locator('[data-print-for]').all())assert.notEqual(await mirror.textContent(),'');
 assert.equal(await page.locator('[data-print-for="guided_payment_preference_unsure"]').textContent(),'Yes');
 assert.equal(await page.locator('[data-print-for="guided_quoted_payment_taxes"]').textContent(),'Included');
 assert.equal(await page.locator('[data-print-for="guided_remaining_comfort"]').textContent(),'Not sure');
 assert.equal(await page.locator('#send-section').isVisible(),false);assert.equal(await page.locator('#full_name').inputValue(),'');
 const dir=process.env.SCREENSHOT_DIR;if(dir){fs.mkdirSync(dir,{recursive:true});await page.pdf({path:path.join(dir,'guided-filled-print.pdf'),format:'Letter',printBackground:true});}
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.equal(await page.locator('details.comparison[open]').count(),0);
 await page.locator('#quick-review').click();assert.equal(await page.locator('#review-panel').isVisible(),false);assert.equal(requests.length,0);
 await page.locator('#full_name').fill('Workbook Guided Test');await page.locator('#email').fill('guided@example.com');
 await page.locator('#quick-review').click();assert.equal(await page.locator('#review-panel').isVisible(),true);assert.equal(await page.locator('#review-content img').count(),0);
 const review=await page.locator('#review-content').innerText();for(const [k,v]of Object.entries(data)){if(typeof v==='string'&&!['included','separate','not_applicable','not_sure','lower_payment'].includes(v))assert.ok(review.includes(v),k);}
 await page.locator('#confirm-send').click();await page.getByText('We couldn’t confirm',{exact:false}).waitFor();
 const body=requests[0];assert.equal(body.version,2);assert.equal(body.answers.exercises,undefined);assert.equal(body.answers.next_decision,undefined);
 for(const[k,v]of Object.entries(data)){const actual=k.split('.').reduce((o,k)=>o[k],body.answers);assert.equal(actual,v,k);}
 mode='malformed';await page.locator('#confirm-send').click();await page.getByText('We couldn’t confirm',{exact:false}).waitFor();assert.equal(requests[1].submission_id,body.submission_id);
 mode='rate';await page.locator('#confirm-send').click();await page.getByText('too many requests',{exact:false}).waitFor();assert.equal(requests[2].submission_id,body.submission_id);
 await page.locator('#edit-workbook').click();await page.locator('#guided_priority').selectOption('savings_left');await page.locator('#quick-review').click();mode='hold';await page.locator('#confirm-send').click();await page.waitForFunction(()=>document.querySelector('#confirm-send').disabled);
 assert.equal(await page.locator('#guided_priority').isDisabled(),true);assert.equal(await page.locator('#guided_payment_preference_unsure').isDisabled(),true);await page.evaluate(()=>document.querySelector('#confirm-send').click());assert.equal(requests.length,4);assert.notEqual(requests[3].submission_id,body.submission_id);release();
 await page.getByText('Your workbook was received for review',{exact:false}).waitFor();assert.equal(await page.locator('#question').inputValue(),data.question);
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:900});await page.locator('#guided-3').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const box=await page.locator('.workbook-actions').boundingBox();assert.ok(box.y>=-1);const sizes=await page.locator('.workbook-actions>*').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));assert.ok(sizes.every(h=>h>=44));if(dir)await page.screenshot({path:path.join(dir,`guided-${width}-scrolled.png`)});}
 assert.equal(await page.locator('#calendar-container iframe').count(),0);await page.route('https://calendly.com/**',route=>route.fulfill({body:'Mock calendar; no booking'}));await page.locator('#quick-book').click();assert.equal(await page.locator('#calendar-container iframe').getAttribute('src'),'https://calendly.com/brookskelly/30min');
 // All allowed text fields at their Unicode maximum must still obey the total byte cap.
 await page.evaluate(()=>document.querySelectorAll('[data-answer][maxlength]').forEach(n=>{n.value='漢'.repeat(Number(n.maxLength));n.dispatchEvent(new Event('input',{bubbles:true}));}));await page.locator('#quick-review').click();assert.ok((await page.locator('#send-status').textContent()).includes('too long'));assert.equal(requests.length,4);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,answerControls:Object.keys(data).length,mockedRequests:requests.length,checks:['five questions/no old20','single Q3amount','optional blank comparison','all answers print/review/payload parity','checkbox/select states','identity-free print','print state restoration','send identity validation','safe text review','v2schema no legacy fields','503/malformed/429 preserve answers','stable retry UUID','select edit new UUID','pending controls/double send blocked','receipt-only success','no persistence','320/390/768/1440 sticky/top/overflow','calendar opt-in','UTF8 cap','no browser errors']}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
