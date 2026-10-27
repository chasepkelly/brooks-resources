/* Mocked HTTP only: no real submissions, notifications, bookings or applications. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const config=require('../fthb/tools-config-v3.json');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const results=[];
 const dir=process.env.SCREENSHOT_DIR;if(dir)fs.mkdirSync(dir,{recursive:true});
 for(const [slug,schema]of Object.entries(config)){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let mode='failure',release;const requests=[];
  await page.route('https://oznktsrggzrzjgzzhyxv.supabase.co/functions/v1/workbook-submit',async route=>{const b=route.request().postDataJSON();requests.push(b);if(mode==='hold')await new Promise(r=>release=r);if(mode==='failure')return route.fulfill({status:503,json:{ok:false,error:'unavailable'}});if(mode==='malformed')return route.fulfill({status:200,body:'not a receipt'});return route.fulfill({status:202,json:{ok:true,submission_id:b.submission_id}});});
  await page.goto((process.env.WORKBOOK_URL||'http://127.0.0.1:8794')+`/fthb/${slug}.html`);const fields=schema.steps.flatMap(s=>s.fields);
  assert.equal(await page.locator('.guided-question').count(),schema.steps.length);assert.equal(await page.locator('[data-answer]').count(),fields.length);assert.equal(await page.locator('[data-exercise],.exercise-index,details.drill').count(),0);
  const expected={};for(const field of fields){const control=page.locator('#'+field.id);assert.equal(await control.inputValue(),'');const value=field.type==='select'?field.options.at(-1).value:field.type==='date'?'2027-02-12':field.id==='question'?'<img src=x onerror=alert(1)>':`Answer ${slug}.${field.id}`;expected[field.id]=value;if(field.type==='select')await control.selectOption(value);else await control.fill(value);}
  await page.evaluate(()=>{window.print=()=>dispatchEvent(new Event('beforeprint'));});await page.locator('#print-workbook').click();await page.emulateMedia({media:'print'});
  for(const f of fields){const want=f.type==='select'?f.options.at(-1).label:expected[f.id];assert.equal(await page.locator(`[data-print-for="${f.id}"]`).textContent(),want);}
  assert.equal(await page.locator('#send-section').isVisible(),false);assert.equal(await page.locator('#full_name').inputValue(),'');
  if(dir)await page.pdf({path:path.join(dir,slug+'-filled.pdf'),format:'Letter',printBackground:true});await page.emulateMedia({media:'screen'});
  await page.locator('#quick-review').click();assert.equal(await page.locator('#review-panel').isVisible(),false);assert.equal(requests.length,0);
  await page.locator('#full_name').fill('Tool Review Test');await page.locator('#email').fill('review@example.com');await page.locator('#quick-review').click();assert.equal(await page.locator('#review-panel').isVisible(),true);assert.equal(await page.locator('#review-content img').count(),0);
  const review=await page.locator('#review-content').innerText();for(const f of fields)assert.ok(review.includes(f.type==='select'?f.options.at(-1).label:expected[f.id]),slug+'.'+f.id);
  await page.locator('#confirm-send').click();await page.getByText('We couldn’t confirm',{exact:false}).waitFor();const first=requests[0];assert.equal(first.workbook,slug);assert.equal(first.version,3);assert.deepEqual(first.answers,expected);
  mode='malformed';await page.locator('#confirm-send').click();await page.getByText('We couldn’t confirm',{exact:false}).waitFor();assert.equal(requests[1].submission_id,first.submission_id);
  await page.locator('#edit-workbook').click();await page.locator('#question').fill('Updated question');await page.locator('#quick-review').click();mode='hold';await page.locator('#confirm-send').click();await page.waitForFunction(()=>document.querySelector('#confirm-send').disabled);assert.equal(await page.locator('#question').isDisabled(),true);await page.evaluate(()=>document.querySelector('#confirm-send').click());assert.equal(requests.length,3);assert.notEqual(requests[2].submission_id,first.submission_id);release();await page.getByText('Your answers were received',{exact:false}).waitFor();assert.equal(await page.locator('#question').inputValue(),'Updated question');
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:900});await page.locator('#guided-2').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const bar=await page.locator('.workbook-actions').boundingBox();assert.ok(bar.y>=-1);assert.equal(await page.locator('.workbook-actions>*').count(),4);assert.ok((await page.locator('.workbook-actions>*').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height))).every(h=>h>=44));if(dir&&width===390)await page.screenshot({path:path.join(dir,slug+'-390.png')});}
  assert.equal(await page.locator('#calendar-container iframe').count(),0);assert.deepEqual(errors,[]);results.push({slug,steps:schema.steps.length,answers:fields.length,mockedRequests:requests.length,pass:true});await page.close();
 }
 console.log(JSON.stringify({pass:true,tools:results,totalAnswers:results.reduce((n,r)=>n+r.answers,0),realRequests:0}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
