import { JSDOM } from 'jsdom'
import fetch from 'node-fetch'
import fs from 'fs'

const URL = 'http://localhost:3000/origin_subject2.html'
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
        school: document.querySelector(`.breadcrumb`).children[1].textContent.trim(),
        department: document.querySelector(`.breadcrumb`).children[2].textContent.trim(),
        courseName: document.querySelector(`.breadcrumb`).children[3].textContent.trim(),
        date: new Date().getTime(),
        
        url: pageURL,

        information: {
            category: {},
            credit: {},
            class: {
                semester: {},
            },
            instructor: {},
            textbook: {},

        },

        objectives: {},
        rubric: {
            list: [],
        },
        assignObjectives: {
            list: [],
        },
        method: {},
        characteristics: {},
        plan: {},
        weight: {},
    }

    // 
    // 教科基本情報
    //  
    const table = document.querySelectorAll('tbody')[1]

    // 開講年度
    parse.information.year = parseFloat(table.children[0].children[3].textContent.trim().match(/[0-9][0-9][0-9][0-9]/g)[0])

    // 教科番号
    parse.information.code = table.children[2].children[1].textContent.trim()

    // 科目区分
    const category = table.children[2].children[3].textContent.trim().split(' / ')
    parse.information.category.typeText = category[0];
    parse.information.category.takeText = category[1];

    if (category[1] == '必修' || category[1] == '集中') {
        parse.information.category.take = true;
    }
    else if (category[1] == '選択') {
        parse.information.category.take = false;
    }
    else {
        parse.information.category.take = false;
    }

    // 単位
    const credit = table.children[3].children[3].textContent.trim().split(': ')
    if (credit[0] == "履修単位") {
        parse.information.credit.kosen = true;
    }
    else if (credit[0] == "学修単位") {
        parse.information.credit.kosen = false;
    }
    else {
        parse.information.credit.kosen = false;
    }
    parse.information.credit.text = credit[0];
    parse.information.credit.count = parseFloat(credit[1]);

    // 授業時数
    parse.information.class.grade = parseFloat(table.children[4].children[3].textContent.trim())

    const format = table.children[3].children[1].textContent.trim()
    parse.information.format = format;

    const semesterText = table.children[5].children[1].textContent.trim()
    parse.information.class.semester.text = semesterText;
    if (semesterText == "前期") {
        parse.information.class.semester.first = parseFloat(table.children[5].children[3].textContent.trim());
        parse.information.class.semester.second = 0;
    }
    else if (semesterText == "後期") {
        parse.information.class.semester.first = 0;
        parse.information.class.semester.second = parseFloat(table.children[5].children[3].textContent.trim());
    }
    else if (semesterText == "通年") {
        parse.information.class.semester.first = parseFloat(table.children[5].children[3].textContent.trim());
        parse.information.class.semester.second = parseFloat(table.children[5].children[3].textContent.trim());
    }
    else { }

    // 教員
    parse.information.instructor.all = table.children[7].children[1].textContent.trim();
    parse.information.instructor.list = table.children[7].children[1].textContent.trim().split(',');

    // 教材
    parse.information.textbook.all = table.children[6].children[1].textContent.trim();
    parse.information.textbook.list = table.children[6].children[1].textContent.trim().split(/,|、/g)


    //
    // 到達目標
    //

    const syllabusContent = document.querySelector('#MainContent_SubjectSyllabus_syllabusContent')
    parse.objectives = syllabusContent.children[1].innerHTML.trim().replace(/<br>/g, '\n')

    // ルーブリック
    let hyouka = Array.from(document.querySelector('#MainContent_SubjectSyllabus_hyouka').children[0].children)
    hyouka = hyouka.slice(1)

    hyouka.forEach((e, i) => {
        let point = e.children[0].textContent.trim();

        parse.rubric[point] = {};
        parse.rubric.list.push(point)
        parse.rubric[point].ideal = e.children[1].innerHTML.trim().replace('<br>', '\n');
        parse.rubric[point].standard = e.children[2].innerHTML.trim().replace('<br>', '\n');
        parse.rubric[point].unacceptable = e.children[3].innerHTML.trim().replace('<br>', '\n');
    })

    // 学科の到達目標項目との関係
    const assignObjectives = Array.from(document.querySelector('#MainContent_SubjectSyllabus_syllabusContent').children[5].children)

    assignObjectives.forEach((e, i) => {
        parse.assignObjectives.list.push(e.getAttribute('data-info'))
        parse.assignObjectives[e.getAttribute('data-info')] = e.getAttribute('data-item_name')
    })

    // 教育方法
    const method = document.querySelector('#MainContent_SubjectSyllabus_syllabusContent').children[7]

    parse.method.outline = method.children[2].innerHTML.trim().replace('<br>', '\n');
    parse.method.style = method.children[5].innerHTML.trim().replace('<br>', '\n');
    parse.method.notice = method.children[8].innerHTML.trim().replace('<br>', '\n');

    // 授業の属性
    parse.characteristics.ActiveLearning = document.querySelector('#MainContent_SubjectSyllabus_isActiveLearning').checked
    parse.characteristics.AidedByICT = document.querySelector('#MainContent_SubjectSyllabus_isAidedByICT').checked
    parse.characteristics.ApplicableForRemoteClass = document.querySelector('#MainContent_SubjectSyllabus_isApplicableForRemoteClass').checked
    parse.characteristics.InstructorProfessionallyExperienced = document.querySelector('#MainContent_SubjectSyllabus_isInstructorProfessionallyExperienced').checked

    // 授業計画
    parse.plan.first = [];
    parse.plan.second = [];
    document.querySelectorAll('.week_number').forEach((e, i) => {
        if (i <= 7) {
            parse.plan.first.push({
                week: parseFloat(e.parentElement.children[0].textContent.trim().match(/\d*/)[0]),
                theme: e.parentElement.children[1].textContent.trim(),
                goal: e.parentElement.children[2].textContent.trim(),
            })
        }
        else if (i <= 15) {
            parse.plan.first.push({
                week: parseFloat(e.parentElement.children[0].textContent.trim().match(/\d*/)[0]),
                theme: e.parentElement.children[1].textContent.trim(),
                goal: e.parentElement.children[2].textContent.trim(),
            })
        }
        else if (1 <= 23) {
            parse.plan.second.push({
                week: parseFloat(e.parentElement.children[0].textContent.trim().match(/\d*/)[0]),
                theme: e.parentElement.children[1].textContent.trim(),
                goal: e.parentElement.children[2].textContent.trim(),
            })
        }
        else if (i <= 31) {
            parse.plan.second.push({
                week: parseFloat(e.parentElement.children[0].textContent.trim().match(/\d*/)[0]),
                theme: e.parentElement.children[1].textContent.trim(),
                goal: e.parentElement.children[2].textContent.trim(),
            })
        }
    })

    // モデルコアカリキュラムの学習内容と到達目標
    const mccTable = document.querySelector('#MainContent_SubjectSyllabus_mccTable').outerHTML.replace(/\r?\n?\t/g, '')

    parse.mccHTML = mccTable;

    // 評価割合
    let weightContents = Array.from(document.querySelector('#MainContent_SubjectSyllabus_wariaiTable').firstElementChild.firstElementChild.children)
    weightContents = weightContents.slice(1, weightContents.length - 1)
    weightContents.forEach((e, i) => {
        weightContents[i] = e.textContent.trim();
    })
    const weightPoint = Array.from(document.querySelector('#MainContent_SubjectSyllabus_wariaiTable').firstElementChild.children).splice(1);
    parse.weight.point = weightContents;
    parse.weight.contents = [];

    weightPoint.forEach((e, i) => {
        const pointData = Array.from(e.children)
        pointData.shift();
        pointData.pop();

        const pointName = e.children[0].textContent.trim();
        parse.weight[pointName] = {};

        parse.weight.contents.push(pointName)
        pointData.forEach((e, i) => {
            parse.weight[pointName][weightContents[i]] = parseFloat(e.textContent.trim())
        })
    })

    



    console.log(`success ${performance.now() - start}ms`)

    fs.writeFile('output_course.json', JSON.stringify(parse, null, '    '), () => {
        console.log('data saved.')
    });
}

parse(URL)