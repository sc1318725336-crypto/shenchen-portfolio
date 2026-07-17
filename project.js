document.documentElement.classList.add('js');

const projects = {
  'space-01': { group: 'space', number: '01', year: '2025', title: '南京市沿江中学校史文化长廊设计方案', lede: '以校园历史为内容主线，将品牌识别、信息导视与空间体验整合为一条可被行走、阅读和记忆的文化长廊。' },
  'space-02': { group: 'space', number: '02', year: '2025', title: '空间设计项目 02', lede: '项目内容与现场图片待补充，页面结构可直接承载项目背景、设计策略、过程与最终成果。' },
  'space-03': { group: 'space', number: '03', year: '2025', title: '空间设计项目 03', lede: '项目内容与现场图片待补充，页面结构可直接承载项目背景、设计策略、过程与最终成果。' },
  'space-04': { group: 'space', number: '04', year: '2025', title: '空间设计项目 04', lede: '项目内容与现场图片待补充，页面结构可直接承载项目背景、设计策略、过程与最终成果。' },
  ...Object.fromEntries(Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return [`packaging-${number}`, {
      group: 'packaging',
      number,
      year: index < 4 ? '2026' : '2025',
      title: `包装设计项目 ${number}`,
      lede: '从品牌策略、产品信息到包装结构与货架识别，建立完整且可持续延展的产品体验。项目图片与具体内容可继续替换补充。'
    }];
  }))
};

const categoryProfiles = {
  space: {
    category: 'SPACE',
    display: 'SPA<span>CE</span>',
    kind: 'WAYFINDING<br />ENVIRONMENT',
    back: './index.html#space',
    type: '文化空间 / 导视设计',
    service: '概念策略、视觉系统、空间延展',
    role: '设计主导 / 项目管理'
  },
  packaging: {
    category: 'PACKAGING',
    display: 'PAC<span>K</span>AGING',
    kind: 'BRAND SYSTEM<br />PRODUCT EXPERIENCE',
    back: './index.html#packaging',
    type: '品牌包装 / 产品视觉',
    service: '品牌策略、包装系统、成品落地',
    role: '创意主导 / 项目管理',
    overviewTitle: '让包装不只被看见，<br />更成为<span>拿起产品的理由</span>。',
    overviewCopy: '项目从品牌定位、产品卖点与消费场景出发，将信息层级、视觉识别、包装结构和生产工艺整合为一套完整体验。设计既服务货架识别，也延续到触摸、开启、使用与分享。',
    noteEn: 'THE PACKAGE BECOMES<br />THE FIRST PRODUCT EXPERIENCE.',
    noteCn: '包装不是产品之外的装饰，<br />而是品牌价值被感知的第一刻。',
    systemTitle: '从货架识别到开箱体验，<br /><span>每一层信息都有次序。</span>',
    steps: [
      ['梳理产品价值', '提炼购买理由与核心卖点，建立正面、侧面和背面的信息优先级。'],
      ['建立包装语言', '统一色彩、字体、图形与版式，让单品与系列共享清晰的品牌识别。'],
      ['验证生产落地', '结合材料、结构、印刷与成本条件，确保创意能够稳定进入真实生产。']
    ],
    outcomeTitle: '从第一眼到打开包装，<br />品牌体验持续发生。',
    galleryCaptions: ['产品定位与竞品语境', '信息层级与版面系统', '材料、工艺与结构细节'],
    outcomeCaptions: ['包装系列与主视觉', '货架陈列与识别', '开箱体验与成品细节']
  }
};

const ids = Object.keys(projects);
const requestedId = new URLSearchParams(location.search).get('project') || ids[0];
const activeId = projects[requestedId] ? requestedId : ids[0];
const activeProject = projects[activeId];
const profile = categoryProfiles[activeProject.group];
const groupIds = ids.filter((id) => projects[id].group === activeProject.group);
const activeIndex = groupIds.indexOf(activeId);
const previousId = groupIds[(activeIndex - 1 + groupIds.length) % groupIds.length];
const nextId = groupIds[(activeIndex + 1) % groupIds.length];

document.body.dataset.projectGroup = activeProject.group;
document.querySelectorAll('[data-project-number]').forEach((node) => { node.textContent = activeProject.number; });
document.querySelectorAll('[data-project-year]').forEach((node) => { node.textContent = activeProject.year; });
document.querySelector('[data-project-total]').textContent = String(groupIds.length).padStart(2, '0');
document.querySelector('[data-project-category]').textContent = profile.category;
document.querySelector('[data-project-display]').innerHTML = profile.display;
document.querySelector('[data-project-kind]').innerHTML = profile.kind;
document.querySelector('[data-project-title]').textContent = activeProject.title;
document.querySelector('[data-project-lede]').textContent = activeProject.lede;
document.querySelector('[data-project-type]').textContent = profile.type;
document.querySelector('[data-project-service]').textContent = profile.service;
document.querySelector('[data-project-role]').textContent = profile.role;
document.querySelector('[data-project-back]').href = profile.back;
document.title = activeProject.title + ' — Shenchen 沈辰';

if (activeProject.group === 'packaging') {
  document.querySelector('#overview-title').innerHTML = profile.overviewTitle;
  document.querySelector('.overview-copy > p').textContent = profile.overviewCopy;
  document.querySelector('.overview-note .en').innerHTML = profile.noteEn;
  document.querySelector('.overview-note > span').innerHTML = profile.noteCn;
  document.querySelector('.system-heading h2').innerHTML = profile.systemTitle;
  document.querySelector('.outcome-heading h2').innerHTML = profile.outcomeTitle;
  document.querySelector('.case-cover').dataset.slot = 'PACKAGING / COVER';
  document.querySelector('.case-cover figcaption span:last-child').textContent = '替换为项目包装主视觉或产品系列图';
  document.querySelectorAll('.system-steps li').forEach((item, index) => {
    item.querySelector('h3').textContent = profile.steps[index][0];
    item.querySelector('p').textContent = profile.steps[index][1];
  });
  document.querySelectorAll('.case-gallery figcaption').forEach((caption, index) => {
    caption.textContent = profile.galleryCaptions[index];
  });
  document.querySelectorAll('.outcome-grid figcaption').forEach((caption, index) => {
    caption.textContent = profile.outcomeCaptions[index];
  });
}

const previousLink = document.querySelector('.case-prev');
const nextLink = document.querySelector('.case-next-link');
previousLink.href = '?project=' + previousId;
nextLink.href = '?project=' + nextId;
previousLink.querySelector('b').textContent = '← ' + projects[previousId].number;
nextLink.querySelector('b').textContent = projects[nextId].number + ' →';

const progress = document.querySelector('.case-progress span');
const updateProgress = () => {
  const available = document.documentElement.scrollHeight - innerHeight;
  const ratio = available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0;
  progress.style.transform = 'scaleX(' + ratio + ')';
};
addEventListener('scroll', updateProgress, { passive: true });
addEventListener('resize', updateProgress);
updateProgress();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((node) => node.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  reveals.forEach((node) => observer.observe(node));
}
