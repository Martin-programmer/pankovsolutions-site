// Фирмени данни за footer-а и правните страници. Единствен източник — чл. 4 ЗЕТ + чл. 13 ТЗ
// (CHECKLIST §C, §E). Стойностите са от content/bg/contact.md; вписват се на регистрирания
// език и не се превеждат.
export const company = {
  brand: 'Pankov Solutions',
  name: 'ЕМ ЕН ЕМ ПАРТНЪРС ООД',
  eik: '208242979',
  address: 'гр. Плевен, ул. „България“ № 18, ет. 5, ап. 18',
  phone: '+359 877 944 224',
  phoneHref: 'tel:+359877944224',
  email: 'hello@pankovsolutions.com',
  vat: null as string | null, // TODO: Марти да даде: ДДС №, ако има регистрация
  linkedin: null as string | null, // TODO: Марти да даде: LinkedIn URL
  github: null as string | null, // TODO: Марти да даде: GitHub URL
};
