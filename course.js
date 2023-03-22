import { JSDOM } from 'jsdom'
import fetch from 'node-fetch'
import fs from 'fs'

function nativeInnerText(node) {
    const Node = node;
    return [...node.childNodes].map(node => {
        switch (node.nodeType) {
            case Node.TEXT_NODE:
                return node.textContent;
            case Node.ELEMENT_NODE:
                return nativeInnerText(node);
            default:
                return "";
        }
    }).join("\n");
}


const parseCourse = async (pageURL) => {
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
        rubric: {},
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
    parse.information.year = parseFloat(nativeInnerText(table.children[0].children[3]).trim().match(/[0-9][0-9][0-9][0-9]/g)[0])

    // 教科番号
    parse.information.code = nativeInnerText(table.children[2].children[1]).trim()

    // 授業科目
    parse.information.title = nativeInnerText(table.children[1].children[1]).trim()

    // 科目区分
    const category = nativeInnerText(table.children[2].children[3]).trim().split(' / ')
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
    const credit = nativeInnerText(table.children[3].children[3]).trim().split(': ')
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
    parse.information.class.grade = parseFloat(nativeInnerText(table.children[4].children[3]).trim())

    const format = nativeInnerText(table.children[3].children[1]).trim()
    parse.information.format = format;

    const semesterText = nativeInnerText(table.children[5].children[1]).trim()
    parse.information.class.semester.text = semesterText;
    if (semesterText == "前期") {
        parse.information.class.semester.concentration = false;
        parse.information.class.semester.first = parseFloat(nativeInnerText((table.children[5].children[3])).trim());
        parse.information.class.semester.second = 0;
    }
    else if (semesterText == "後期") {
        parse.information.class.semester.concentration = false;
        parse.information.class.semester.first = 0;
        parse.information.class.semester.second = parseFloat(nativeInnerText(table.children[5].children[3]).trim());
    }
    else if (semesterText == "通年") {
        parse.information.class.semester.concentration = false;
        parse.information.class.semester.first = parseFloat(nativeInnerText(table.children[5].children[3]).trim());
        parse.information.class.semester.second = parseFloat(nativeInnerText(table.children[5].children[3]).trim());
    }
    else if (semesterText == "集中") {
        parse.information.class.semester.concentration = true;
        parse.information.class.semester.first = null;
        parse.information.class.semester.second = null;
    }
    else { }

    // 教員
    parse.information.instructor.all = nativeInnerText(table.children[7].children[1]).trim();
    parse.information.instructor.list = nativeInnerText(table.children[7].children[1]).trim().split(',');

    // 教材
    parse.information.textbook.all = nativeInnerText(table.children[6].children[1]).trim();
    parse.information.textbook.list = nativeInnerText(table.children[6].children[1]).trim().split(/,|、/g)


    //
    // 到達目標
    //

    const syllabusContent = document.querySelector('#MainContent_SubjectSyllabus_syllabusContent')
    parse.objectives = syllabusContent.children[1].innerHTML.trim().replace(/<br>/g, '\n')

    // ルーブリック
    let hyouka = Array.from(document.querySelector('#MainContent_SubjectSyllabus_hyouka').children[0].children)
    hyouka = hyouka.slice(1)

    hyouka.forEach((e, i) => {
        let point = Array.from(e.children).slice(1);

        parse.rubric[nativeInnerText(e.children[0])] = {};
        let contentName = nativeInnerText(e.children[0]);

        point.forEach((e, i) => {
            if (i == 0) {
                parse.rubric[contentName].ideal = e.innerHTML.trim().replace('<br>', '\n');
            }
            else if (i == 1) {
                parse.rubric[contentName].standard = e.innerHTML.trim().replace('<br>', '\n');
            }
            else if (i == 2) {
                parse.rubric[contentName].unacceptable = e.innerHTML.trim().replace('<br>', '\n');
            }
        })
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
                week: parseFloat(nativeInnerText(e.parentElement.children[0]).trim().match(/\d*/)[0]),
                theme: nativeInnerText(e.parentElement.children[1]).trim(),
                goal: nativeInnerText(e.parentElement.children[2]).trim(),
            })
        }
        else if (i <= 15) {
            parse.plan.first.push({
                week: parseFloat(nativeInnerText(e.parentElement.children[0]).trim().match(/\d*/)[0]),
                theme: nativeInnerText(e.parentElement.children[1]).trim(),
                goal: nativeInnerText(e.parentElement.children[2]).trim(),
            })
        }
        else if (1 <= 23) {
            parse.plan.second.push({
                week: parseFloat(nativeInnerText(e.parentElement.children[0]).trim().match(/\d*/)[0]),
                theme: nativeInnerText(e.parentElement.children[1]).trim(),
                goal: nativeInnerText(e.parentElement.children[2]).trim(),
            })
        }
        else if (i <= 31) {
            parse.plan.second.push({
                week: parseFloat(nativeInnerText(e.parentElement.children[0]).trim().match(/\d*/)[0]),
                theme: nativeInnerText(e.parentElement.children[1]).trim(),
                goal: nativeInnerText(e.parentElement.children[2]).trim(),
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
        weightContents[i] = nativeInnerText(e).trim();
    })
    const weightPoint = Array.from(document.querySelector('#MainContent_SubjectSyllabus_wariaiTable').firstElementChild.children).splice(1);
    parse.weight.point = weightContents;
    parse.weight.contents = [];

    weightPoint.forEach((e, i) => {
        const pointData = Array.from(e.children)
        pointData.shift();
        pointData.pop();

        const pointName = nativeInnerText(e.children[0]).trim();
        parse.weight[pointName] = {};

        parse.weight.contents.push(pointName)
        pointData.forEach((e, i) => {
            parse.weight[pointName][weightContents[i]] = parseFloat(nativeInnerText(e).trim())
        })
    })


    console.log(`success ${performance.now() - start}ms`)


    let changed = JSON.parse(fs.readFileSync('dist/dist.json'))
    changed.courseData[parse.information.code] = parse
    fs.writeFileSync('dist/dist.json', JSON.stringify(changed, null, '    '))

}

JSON.parse(fs.readFileSync('dist/pageList.json')).forEach((e, i) => {
    parseCourse(e)
})

