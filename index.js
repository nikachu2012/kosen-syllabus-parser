import {JSDOM} from 'jsdom'
import fetch from 'node-fetch'

const pageURL = 'https://syllabus.kosen-k.go.jp/Pages/PublicSubjects?school_id=22&department_id=15&year=2022&lang=ja'

console.log(`kosen-syllabus-parser v1.0.0`)
console.log(`(C) ${new Date().getFullYear()} nikachu2012`)
const parse = async () => {
    const res = await fetch(pageURL);
    const body = await res.text();

    const dom = new JSDOM(body);
    console.log(body)

    const document = dom.window.document

    console.log(document.querySelector('#sytablenc').outerHTML)
}

parse();
