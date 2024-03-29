import { JSDOM } from 'jsdom'
import fetch from 'node-fetch'
import fs from 'fs'

const url = JSON.parse(fs.readFileSync("config.json")).url
const version = JSON.parse(fs.readFileSync("package.json")).version;

console.log(`kosen-syllabus-parser v${version} / (C) ${new Date().getFullYear()} nikachu2012`)
const parse = async (pageURL) => {
    const start = performance.now();

    // ファイルDL
    console.log(`${pageURL} download ${performance.now() - start}ms`)
    const res = await fetch(pageURL);
    const body = await res.text();
    console.log(`success. ${performance.now() - start}ms`)

    // DOM生成
    console.log(`DOM create`)
    const dom = new JSDOM(body);
    const document = dom.window.document
    console.log(`success ${performance.now() - start}ms`)



    // パースJSON生成
    console.log(`parseData create`)

    let parse = {
        school: document.querySelector(`.breadcrumb`).childNodes[3].textContent.trim(),
        department: document.querySelector(`.col-xs-4`).textContent.trim(),
        time: new Date().getTime(),
        created: "kosen-syllabus-parser v" + version,
        url: pageURL,

        course: [],

        instructor: {},
    };


    const yearJPN = document.querySelectorAll(`.btn-group`)[1].childNodes[1].textContent.trim()
    if (yearJPN.match(/^..(?=[0-9][0-9]年度)/)[0] == '令和') {
        parse.year = 2018 + parseFloat(yearJPN.match(/(?<=^..)[0-9][0-9](?=年度)/)[0]);
    }
    else if (yearJPN.match(/^..(?=[0-9][0-9]年度)/)[0] == '平成') {
        parse.year = 2019 + (parseFloat(yearJPN.match(/(?<=^..)[0-9][0-9](?=年度)/)[0]) - 31);
    }
    else {
        console.error(`can't parse year`)
    }

    const subjectList = document.querySelectorAll(`#sytablenc tr[data-course-value]`);


    parse.courseList = [];

    // URLリスト
    let URLList = [];

    // 科目ごとループ
    subjectList.forEach((e, i) => {
        //e=科目ごとのDOM
        //i=index
        const subjectNameList = document.querySelectorAll('.mcc-show')[i]

        let subjectData = {
            category: {},
            credit: {},
            class: {
                semester: {},
                quarter: {},
            },
            instructor: {},
        }

        // コースの区分
        const typeText = e.children[0].textContent.trim()
        const takeText = e.children[1].textContent.trim()
        subjectData.category.typeText = typeText;
        subjectData.category.takeText = takeText;

        if (takeText == '必修' || takeText == '集中') {
            subjectData.category.take = true;
        }
        else if (takeText == '選択') {
            subjectData.category.take = false;
        }
        else {
            subjectData.category.take = false;
        }

        // 科目名
        subjectData.title = subjectNameList.textContent.trim();
        parse.courseList.push(subjectNameList.textContent.trim())

        var location = new URL(pageURL);


        // 詳細ページのURL取得
        if (subjectNameList.tagName == 'A') {
            subjectData.description = location.protocol + '//' + location.hostname + subjectNameList.getAttribute('href');
            URLList.push(location.protocol + '//' + location.hostname + subjectNameList.getAttribute('href'))
            subjectData.descVisibility = true;
        }
        else if (subjectNameList.tagName == "SPAN") {
            subjectData.description = location.protocol + '//' + location.hostname + document.querySelectorAll('.mcc-hide')[i].getAttribute('href');
            URLList.push(location.protocol + '//' + location.hostname + document.querySelectorAll('.mcc-hide')[i].getAttribute('href'))
            subjectData.descVisibility = false;
        }
        else {
            subjectData.description = null;
            subjectData.descVisibility = false;
        }

        // 科目番号
        subjectData.code = e.children[3].textContent.trim();

        // 単位
        const creditType = e.children[4].textContent.trim();
        if (creditType == "履修単位") {
            subjectData.credit.kosen = true;
        }
        else if (creditType == "学修単位") {
            subjectData.credit.kosen = false;
        }
        else {
            subjectData.credit.kosen = false;
        }
        subjectData.credit.text = creditType;
        subjectData.credit.count = parseFloat(e.children[5].textContent.trim());

        // 授業時数
        if (e.children[6].textContent.trim() !== '' || e.children[7].textContent.trim() !== '' || e.children[8].textContent.trim() !== '' || e.children[9].textContent.trim() !== '') {
            subjectData.class.grade = 1;

            if (e.children[6].textContent.trim() !== "集中講義") {
                subjectData.class.concentration = false;

                const firstQuarter = Number(e.children[6].textContent.trim(), 10);
                const secondQuarter = Number(e.children[7].textContent.trim(), 10);
                const thirdQuarter = Number(e.children[8].textContent.trim(), 10);
                const fourthQuarter = Number(e.children[9].textContent.trim(), 10)

                subjectData.class.hour = firstQuarter + secondQuarter + thirdQuarter + fourthQuarter

                subjectData.class.semester.first = firstQuarter + secondQuarter;
                subjectData.class.semester.second = thirdQuarter + fourthQuarter;

                if (e.children[6].colSpan == 2) {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = null;
                }
                else {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = secondQuarter;
                }

                if (e.children[8].colSpan == 2) {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = null;
                }
                else {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = fourthQuarter;
                }
            }
            else {
                subjectData.class.concentration = true;

                subjectData.class.hour = null;

                subjectData.class.semester.first = null;
                subjectData.class.semester.second = null;

                subjectData.class.quarter.first = null;
                subjectData.class.quarter.second = null;
                subjectData.class.quarter.third = null;
                subjectData.class.quarter.fourth = null;
            }

        }
        else if (e.children[10].textContent.trim() !== '' || e.children[11].textContent.trim() !== '' || e.children[12].textContent.trim() !== '' || e.children[13].textContent.trim() !== '') {
            subjectData.class.grade = 2;

            if (e.children[10].textContent.trim() !== "集中講義") {
                subjectData.class.concentration = false;

                const firstQuarter = Number(e.children[10].textContent.trim(), 10);
                const secondQuarter = Number(e.children[11].textContent.trim(), 10);
                const thirdQuarter = Number(e.children[12].textContent.trim(), 10);
                const fourthQuarter = Number(e.children[13].textContent.trim(), 10)

                subjectData.class.hour = firstQuarter + secondQuarter + thirdQuarter + fourthQuarter

                subjectData.class.semester.first = firstQuarter + secondQuarter;
                subjectData.class.semester.second = thirdQuarter + fourthQuarter;

                if (e.children[10].colSpan == 2) {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = null;
                }
                else {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = secondQuarter;
                }

                if (e.children[12].colSpan == 2) {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = null;
                }
                else {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = fourthQuarter;
                }
            }
            else {
                subjectData.class.concentration = true;

                subjectData.class.hour = null;

                subjectData.class.semester.first = null;
                subjectData.class.semester.second = null;

                subjectData.class.quarter.first = null;
                subjectData.class.quarter.second = null;
                subjectData.class.quarter.third = null;
                subjectData.class.quarter.fourth = null;
            }
        }
        else if (e.children[14].textContent.trim() !== '' || e.children[15].textContent.trim() !== '' || e.children[16].textContent.trim() !== '' || e.children[17].textContent.trim() !== '') {
            subjectData.class.grade = 3;

            if (e.children[14].textContent.trim() !== "集中講義") {
                subjectData.class.concentration = false;
                const firstQuarter = Number(e.children[14].textContent.trim(), 10);
                const secondQuarter = Number(e.children[15].textContent.trim(), 10);
                const thirdQuarter = Number(e.children[16].textContent.trim(), 10);
                const fourthQuarter = Number(e.children[17].textContent.trim(), 10)

                subjectData.class.hour = firstQuarter + secondQuarter + thirdQuarter + fourthQuarter

                subjectData.class.semester.first = firstQuarter + secondQuarter;
                subjectData.class.semester.second = thirdQuarter + fourthQuarter;

                if (e.children[14].colSpan == 2) {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = null;
                }
                else {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = secondQuarter;
                }

                if (e.children[16].colSpan == 2) {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = null;
                }
                else {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = fourthQuarter;
                }
            }
            else {
                subjectData.class.concentration = true;

                subjectData.class.hour = null;

                subjectData.class.semester.first = null;
                subjectData.class.semester.second = null;

                subjectData.class.quarter.first = null;
                subjectData.class.quarter.second = null;
                subjectData.class.quarter.third = null;
                subjectData.class.quarter.fourth = null;
            }
        }
        else if (e.children[18].textContent.trim() !== '' || e.children[19].textContent.trim() !== '' || e.children[20].textContent.trim() !== '' || e.children[21].textContent.trim() !== '') {
            subjectData.class.grade = 4;

            if (e.children[18].textContent.trim() !== "集中講義") {
                subjectData.class.concentration = false;
                const firstQuarter = Number(e.children[18].textContent.trim(), 10);
                const secondQuarter = Number(e.children[19].textContent.trim(), 10);
                const thirdQuarter = Number(e.children[20].textContent.trim(), 10);
                const fourthQuarter = Number(e.children[21].textContent.trim(), 10)

                subjectData.class.hour = firstQuarter + secondQuarter + thirdQuarter + fourthQuarter

                subjectData.class.semester.first = firstQuarter + secondQuarter;
                subjectData.class.semester.second = thirdQuarter + fourthQuarter;

                if (e.children[18].colSpan == 2) {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = null;
                }
                else {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = secondQuarter;
                }

                if (e.children[20].colSpan == 2) {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = null;
                }
                else {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = fourthQuarter;
                }
            } else {
                subjectData.class.concentration = true;

                subjectData.class.hour = null;

                subjectData.class.semester.first = null;
                subjectData.class.semester.second = null;

                subjectData.class.quarter.first = null;
                subjectData.class.quarter.second = null;
                subjectData.class.quarter.third = null;
                subjectData.class.quarter.fourth = null;
            }
        }
        else if (e.children[22].textContent.trim() !== '' || e.children[23].textContent.trim() !== '' || e.children[24].textContent.trim() !== '' || e.children[25].textContent.trim() !== '') {
            subjectData.class.grade = 5;
            if (e.children[22].textContent.trim() !== "集中講義") {
                subjectData.class.concentration = false;
                const firstQuarter = Number(e.children[22].textContent.trim(), 10);
                const secondQuarter = Number(e.children[23].textContent.trim(), 10);
                const thirdQuarter = Number(e.children[24].textContent.trim(), 10);
                const fourthQuarter = Number(e.children[25].textContent.trim(), 10)

                subjectData.class.hour = firstQuarter + secondQuarter + thirdQuarter + fourthQuarter

                subjectData.class.semester.first = firstQuarter + secondQuarter;
                subjectData.class.semester.second = thirdQuarter + fourthQuarter;

                if (e.children[22].colSpan == 2) {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = null;
                }
                else {
                    subjectData.class.quarter.first = firstQuarter;
                    subjectData.class.quarter.second = secondQuarter;
                }

                if (e.children[24].colSpan == 2) {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = null;
                }
                else {
                    subjectData.class.quarter.third = thirdQuarter;
                    subjectData.class.quarter.fourth = fourthQuarter;
                }
            } else {
                subjectData.class.concentration = true;

                subjectData.class.hour = null;

                subjectData.class.semester.first = null;
                subjectData.class.semester.second = null;

                subjectData.class.quarter.first = null;
                subjectData.class.quarter.second = null;
                subjectData.class.quarter.third = null;
                subjectData.class.quarter.fourth = null;
            }
        }

        // 担当教員
        const instructorText = e.children[26].textContent.trim();
        const instructorList = instructorText.split(',');
        subjectData.instructor.text = instructorText;
        subjectData.instructor.list = instructorList

        instructorList.forEach((e, i) => {
            if (parse.instructor[e] == undefined) {
                parse.instructor[e] = {};
                parse.instructor[e].name = e;
                parse.instructor[e].subject = {};
                parse.instructor[e].subject.all = [];
                parse.instructor[e].subject.grade = [[], [], [], [], []];
            }
            parse.instructor[e].url = `https://researchmap.jp/researchers?q=${encodeURIComponent(e).replace('%20', '+')}&affiliation=${encodeURIComponent(parse.school)}`
            parse.instructor[e].subject.all.push({
                code: subjectData.code,
                title: subjectData.title,
            })
            parse.instructor[e].subject.grade[subjectData.class.grade - 1].push({
                code: subjectData.code,
                title: subjectData.title,
            })
        })

        // 履修上の区分
        subjectData.division = e.children[27].textContent.trim();

        parse.course.push(subjectData)
    })

    // コースの詳細データの取得
    parse.courseData = {};

    parse.course.forEach(element => {
        parse.courseData[element.code] = null;
    });

    console.log(`success ${performance.now() - start}ms`)

    // ファイルセーブ
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data")
    }

    fs.writeFileSync(`data/dist.json`, JSON.stringify(parse, null, '    '));
    fs.writeFileSync(`data/pageList.json`, JSON.stringify(URLList, null, '    '));
}

parse(url);
