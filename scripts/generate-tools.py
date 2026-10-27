"""Generate seven public static pages from shared template and public v3 form schemas."""
from pathlib import Path
import json,html
root=Path(__file__).resolve().parent.parent
config=json.loads((root/'fthb/tools-config-v3.json').read_text())
template=(root/'scripts/tool-page-template.html').read_text()
disclosures=json.loads((root/'scripts/tool-disclosures.json').read_text())

videos=json.loads((root/'scripts/explainer-videos.json').read_text())
def video_markup(slug):
 if slug not in videos:return ''
 seconds=videos[slug]['seconds']
 return f'<section id="explainer-video" class="workbook-video screen-only" aria-labelledby="explainer-heading"><h2 id="explainer-heading">Watch Brooks explain it</h2><p>{seconds} seconds. Then fill in what you know below.</p><video controls playsinline preload="metadata" poster="videos/{slug}/poster.jpg" aria-label="Brooks explains this workbook"><source src="videos/{slug}/video.mp4" type="video/mp4"><track kind="captions" src="videos/{slug}/captions.vtt" srclang="en" label="English">Your browser cannot play this video. <a href="videos/{slug}/video.mp4">Open the video</a>.</video><p class="video-links"><a href="videos/{slug}/video.mp4">Open video in a new page</a></p></section>'

for slug,schema in config.items():
 s=template
 fields=[f for step in schema['steps'] for f in step['fields']]
 assert len({f['id']for f in fields})==len(fields)
 payload={'workbook':slug,**schema}
 replacements={'TOOL_TITLE':html.escape(schema['title']),'TOOL_HEADING':html.escape(schema['title']),'TOOL_INTRO':html.escape(schema['intro']),'TOOL_QUESTION':html.escape(schema['steps'][0]['title']),'TOOL_SLUG':slug.upper(),'TOOL_SCHEMA':json.dumps(payload,ensure_ascii=False).replace('<','\\u003c'),'TOOL_DISCLOSURES':'<section id="references-disclosures"><h2>References and disclosures</h2>'+'<p>'+html.escape(schema['disclosure'])+'</p><p>Do not enter account numbers, Social Security numbers or other private identifiers. No documents are uploaded here. Your entries stay in this tab until you choose to send them. Printing does not send them. Closing or refreshing the page clears unsent entries.</p>'+''.join(disclosures[slug]).replace('exercises','questions')+'</section>'}
 replacements.update(TOOL_VIDEO=video_markup(slug),TOOL_VIDEO_STYLE='<link rel="stylesheet" href="workbook-video.css">' if slug in videos else '')
 for key,value in replacements.items():s=s.replace('<!-- '+key+' -->',value)
 (root/'fthb'/f'{slug}.html').write_text(s)
print('Generated7tools; payment unchanged')
