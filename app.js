let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let records = [];
let services = [];
let clients = [];
let lastSelectedDate = null;

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function sortClientsByName(clientsList) {
  return clientsList.sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

async function init() {
  const savedRecords = await localforage.getItem('records');
  const savedServices = await localforage.getItem('services');
  const savedClients = await localforage.getItem('clients');
  records = savedRecords || [];
  services = savedServices || [];
  clients = savedClients || [];
  
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  
  renderCalendar();
  updateTotalBar();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayTitle(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthName = monthNames[date.getMonth()];
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const weekday = weekdays[date.getDay()];
  return `${weekday}, ${day} ${monthName}`;
}

function getServiceById(id) {
  return services.find(s => s.id === id) || { name: '—', price: 0 };
}

function getClientById(id) {
  return clients.find(c => c.id === id) || { firstName: '—', lastName: '', phone: '' };
}

async function saveServices() {
  await localforage.setItem('services', services);
}

async function saveClients() {
  await localforage.setItem('clients', clients);
}

function showNotification(text = 'Сохранено!') {
  const el = document.getElementById('notification');
  if (el) {
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2000);
  }
}

function sortServices() {
  services.sort((a, b) => {
    const countA = a.usageCount || 0;
    const countB = b.usageCount || 0;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name);
  });
}

function sortClients() {
  clients.sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

function sortRecordsByTime(records) {
  return records.sort((a, b) => {
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    return timeA.localeCompare(timeB);
  });
}

function renderCalendar() {
  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDayIndex = firstDay.getDay();
  let daysToSubtract = startDayIndex === 0 ? 6 : startDayIndex - 1;
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - daysToSubtract);

  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';

  ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(day => {
    const el = document.createElement('div');
    el.className = 'day-name';
    el.textContent = day;
    calendarEl.appendChild(el);
  });

  const today = new Date();
  const todayStr = formatDate(today);

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = formatDate(date);
    const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

    const dayRecords = records.filter(r => r.date === dateStr);
    const dotsCount = dayRecords.length > 3 ? 3 : dayRecords.length;

    const dayEl = document.createElement('div');
    dayEl.className = 'day-cell';
    if (!isCurrentMonth) dayEl.classList.add('other-month');
    if (dateStr === todayStr) dayEl.classList.add('today');
    if (dateStr === lastSelectedDate) dayEl.classList.add('selected');

    dayEl.textContent = date.getDate();

    if (isCurrentMonth) {
      dayEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDayClick(dateStr);
      });
      dayEl.addEventListener('click', (e) => {
        e.preventDefault();
        handleDayClick(dateStr);
      });

      if (dotsCount > 0) {
        const dots = document.createElement('div');
        dots.className = 'dots';
        for (let j = 0; j < dotsCount; j++) {
          const dot = document.createElement('div');
          dot.className = 'dot';
          dots.appendChild(dot);
        }
        dayEl.appendChild(dots);
      }
    }

    calendarEl.appendChild(dayEl);
  }

  updateTotalBar();
}

function handleDayClick(dateStr) {
  lastSelectedDate = dateStr;
  renderCalendar();
  openDayModal(dateStr);
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

function openModal(htmlContent) {
  document.getElementById('modal-content').innerHTML = htmlContent;
  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function openDayModal(dateStr) {
  let dayRecords = Array.isArray(records) ? records.filter(r => r && r.date === dateStr) : [];
  dayRecords = sortRecordsByTime([...dayRecords]);

  const dateObj = new Date(dateStr);
  const formattedDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

  let dayIncome = 0;
  dayRecords.forEach(r => {
    if (r.serviceIds && Array.isArray(r.serviceIds)) {
      r.serviceIds.forEach(id => {
        const svc = getServiceById(id);
        dayIncome += svc.price;
      });
    }
  });

  const dayTitle = formatDayTitle(dateStr);
  setView('day', dayTitle);

  let html = `<h3>${formattedDate}</h3>`;
  html += `<p><strong>Доход за день: ${dayIncome.toFixed(0)} ₽</strong></p>`;

  if (dayRecords.length > 0) {
    dayRecords.forEach((r, recordIdx) => {
      const client = getClientById(r.clientId);
      const fullName = `${client.firstName} ${client.lastName}`.trim() || '—';
      const phonePart = client.phone ? `(${client.phone})` : '';
      const time = r.time || '—';
      const comment = r.comment || '';

      html += `
        <div class="record-item">
          <strong>${fullName}</strong> ${phonePart}<br>
          Время: ${time}<br>
          ${comment ? `<small>${comment}</small>` : ''}
      `;

      if (r.serviceIds && Array.isArray(r.serviceIds)) {
        r.serviceIds.forEach(serviceId => {
          const service = getServiceById(serviceId);
          html += `
            <div class="service-entry">
              ${service.name} — ${service.price} ₽
            </div>
          `;
        });
      }

      html += `
          <div style="margin-top:10px;">
            <button onclick="editRecord('${r.date}', ${recordIdx})" style="background:#ff9500;padding:4px 8px;font-size:14px;margin-right:6px;">✏️ Редактировать</button>
            <button onclick="moveRecord('${r.date}', ${recordIdx})" style="background:#5ac8fa;padding:4px 8px;font-size:14px;margin-right:6px;">🔄 Перенести</button>
          </div>
        </div>
      `;
    });
  }

  sortClients();
  sortServices();

  let clientOptions = clients.length > 0
    ? clients.map(c => {
        const name = `${c.firstName} ${c.lastName}`.trim();
        return `<option value="${c.id}">${name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`;
      }).join('')
    : '<option>Добавьте клиентов</option>';

  html += `
    <h4>Добавить новую запись</h4>
    <select id="new-client-id">
      ${clientOptions}
    </select>
    <input type="time" id="new-time" />
    <textarea id="new-comment" placeholder="Комментарий"></textarea>

    <div id="service-list">
    </div>

    <button onclick="addServiceField('service-list', false)">➕ Добавить услугу</button>
    <button onclick="saveMultiRecord('${dateStr}')">Сохранить запись</button>
  `;

  openModal(html);
}

function addServiceField(containerId, isEditing) {
  sortServices();
  let serviceOptions = services.length > 0 
    ? services.map(s => `<option value="${s.id}">${s.name} (${s.price} ₽)</option>`).join('')
    : '<option>Добавьте услуги</option>';

  const container = document.getElementById(containerId);
  const div = document.createElement('div');
  div.className = 'service-entry';

  if (isEditing) {
    div.innerHTML = `
      <select class="service-select" style="width:100%;margin:0;">
        ${serviceOptions}
      </select>
      <button class="remove-service">×</button>
    `;
  } else {
    div.innerHTML = `
      <select class="service-select" style="width:100%;margin:0;">
        ${serviceOptions}
      </select>
      <button class="remove-btn">Убрать услугу</button>
    `;
  }

  container.appendChild(div);

  const btn = div.querySelector(isEditing ? '.remove-service' : '.remove-btn');
  btn.addEventListener('click', () => {
    div.remove();
  });
}

function saveMultiRecord(dateStr) {
  const clientId = document.getElementById('new-client-id').value;
  const time = document.getElementById('new-time').value || null;
  const comment = document.getElementById('new-comment').value.trim();
  const selects = document.querySelectorAll('#service-list .service-select');
  const serviceIds = Array.from(selects)
    .map(sel => sel.value)
    .filter(id => id && services.some(s => s.id === id));

  if (!clientId || clients.length === 0) {
    alert('Выберите клиента');
    return;
  }
  if (serviceIds.length === 0) {
    alert('Добавьте хотя бы одну услугу');
    return;
  }

  serviceIds.forEach(id => {
    const service = services.find(s => s.id === id);
    if (service) {
      service.usageCount = (service.usageCount || 0) + 1;
    }
  });
  saveServices();

  records.push({ date: dateStr, clientId, serviceIds, time, comment });
  localforage.setItem('records', records);
  closeModal();
  renderCalendar();
}

function editRecord(dateStr, index) {
  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;
  const record = dayRecords[index];

  sortClients();
  sortServices();

  let clientOptions = clients.map(c => {
    const name = `${c.firstName} ${c.lastName}`.trim();
    return `<option value="${c.id}" ${c.id === record.clientId ? 'selected' : ''}>${name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`;
  }).join('');

  let html = `
    <h3>✏️ Редактировать запись</h3>
    <select id="edit-client-id">
      ${clientOptions}
    </select>
    <input type="time" id="edit-time" value="${record.time || ''}" />
    <textarea id="edit-comment" placeholder="Комментарий">${record.comment || ''}</textarea>

    <h4>Услуги</h4>
    <div id="edit-service-list">
    </div>

    <button onclick="addServiceField('edit-service-list', true)">➕ Добавить услугу</button>
    <button onclick="saveEditedRecord('${dateStr}', ${index})">Сохранить</button>
    <button onclick="deleteRecord('${dateStr}', ${index})" style="background:#ff3b30;">🗑 Удалить запись</button>
    <button onclick="moveRecord('${dateStr}', ${index})" style="background:#5ac8fa;">🔄 Перенести</button>
  `;

  openModal(html);

  const list = document.getElementById('edit-service-list');
  if (record.serviceIds && Array.isArray(record.serviceIds)) {
    record.serviceIds.forEach(id => {
      addServiceField('edit-service-list', true);
      const selects = list.querySelectorAll('.service-select');
      if (selects.length > 0) {
        selects[selects.length - 1].value = id;
      }
    });
  } else {
    addServiceField('edit-service-list', true);
  }
}

function saveEditedRecord(dateStr, index) {
  const clientId = document.getElementById('edit-client-id').value;
  const time = document.getElementById('edit-time').value || null;
  const comment = document.getElementById('edit-comment').value.trim();
  const selects = document.querySelectorAll('#edit-service-list .service-select');
  const serviceIds = Array.from(selects)
    .map(sel => sel.value)
    .filter(id => id && services.some(s => s.id === id));

  if (!clientId) {
    alert('Выберите клиента');
    return;
  }
  if (serviceIds.length === 0) {
    alert('Добавьте хотя бы одну услугу');
    return;
  }

  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;

  const target = dayRecords[index];
  records = records.filter(r => 
    !(r.date === dateStr && 
      r.clientId === target.clientId && 
      JSON.stringify(r.serviceIds) === JSON.stringify(target.serviceIds) &&
      r.time === target.time)
  );

  serviceIds.forEach(id => {
    const service = services.find(s => s.id === id);
    if (service) {
      service.usageCount = (service.usageCount || 0) + 1;
    }
  });
  saveServices();

  records.push({ date: dateStr, clientId, serviceIds, time, comment });
  localforage.setItem('records', records);
  showNotification('Запись обновлена!');
  closeModal();
  openDayModal(dateStr);
}

function deleteRecord(dateStr, index) {
  if (!confirm('Удалить всю запись?')) return;

  const dayRecords = records.filter(r => r.date === dateStr);
  if (index >= dayRecords.length) return;

  const target = dayRecords[index];
  records = records.filter(r => 
    !(r.date === dateStr && 
      r.clientId === target.clientId && 
      JSON.stringify(r.serviceIds) === JSON.stringify(target.serviceIds) &&
      r.time === target.time)
  );

  localforage.setItem('records', records);
  showNotification('Запись удалена!');
  closeModal();
  openDayModal(dateStr);
}

function moveRecord(oldDateStr, index) {
  const dayRecords = records.filter(r => r.date === oldDateStr);
  if (index >= dayRecords.length) return;
  const record = dayRecords[index];

  let html = `
    <h3>🔄 Перенести запись</h3>
    <p><strong>Клиент:</strong> ${getClientById(record.clientId).firstName} ${getClientById(record.clientId).lastName}</p>
    <p><strong>Услуги:</strong> 
      ${record.serviceIds.map(id => getServiceById(id).name).join(', ')}
    </p>
    <input type="date" id="new-move-date" value="${oldDateStr}" />
    <input type="time" id="new-move-time" value="${record.time || ''}" />
    <button onclick="performMoveRecord('${oldDateStr}', ${index})">Перенести</button>
    <button onclick="openDayModal('${oldDateStr}')">Отмена</button>
  `;

  openModal(html);
}

function performMoveRecord(oldDateStr, index) {
  const newDate = document.getElementById('new-move-date').value;
  const newTime = document.getElementById('new-move-time').value || null;

  if (!newDate) {
    alert('Укажите дату');
    return;
  }

  const dayRecords = records.filter(r => r.date === oldDateStr);
  if (index >= dayRecords.length) return;

  const record = dayRecords[index];
  const newRecord = {
    date: newDate,
    clientId: record.clientId,
    serviceIds: [...record.serviceIds],
    time: newTime,
    comment: record.comment
  };

  records = records.filter(r => 
    !(r.date === oldDateStr && 
      r.clientId === record.clientId && 
      JSON.stringify(r.serviceIds) === JSON.stringify(record.serviceIds) &&
      r.time === record.time)
  );

  records.push(newRecord);
  localforage.setItem('records', records);
  showNotification('Запись перенесена!');
  closeModal();
  openDayModal(newDate);
}

// === КЛИЕНТЫ ===
function openClients() {
  sortClients();
  let listHtml = '';
  if (clients.length > 0) {
    listHtml = '<div class="stats-list">';
    clients.forEach(c => {
      const name = `${c.firstName} ${c.lastName}`.trim();
      listHtml += `
        <div class="client-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
          <span>${name} ${c.phone ? '(' + c.phone + ')' : ''}</span>
          <button onclick="editClient('${c.id}')" style="background:#ff9500;padding:4px 8px;font-size:14px;">✏️</button>
        </div>
      `;
    });
    listHtml += '</div>';
  }

  let html = `
    <h3>👥 Мои клиенты</h3>
    <p><strong>Всего: ${clients.length}</strong></p>
    ${listHtml}
  `;

  openModal(html);
  setView('clients');
}

function openAddClientForm() {
  let html = `
    <h3>➕ Новый клиент</h3>
    <input type="text" id="client-first" placeholder="Имя" />
    <input type="text" id="client-last" placeholder="Фамилия (необязательно)" />
    <input type="text" id="client-phone" placeholder="Телефон (необязательно)" />
    <button onclick="addClient()">Сохранить</button>
    <button onclick="openClients()">Отмена</button>
  `;
  openModal(html);
}

async function addClient() {
  const firstName = document.getElementById('client-first').value.trim();
  const lastName = document.getElementById('client-last').value.trim();
  const phone = document.getElementById('client-phone').value.trim();

  if (!firstName) {
    alert('Укажите имя');
    return;
  }

  const newClient = {
    id: Date.now().toString(),
    firstName,
    lastName,
    phone
  };
  clients.push(newClient);
  await saveClients();
  showNotification('Клиент сохранён!');
  closeModal();
  openClients();
}

async function editClient(id) {
  const client = clients.find(c => c.id === id);
  if (!client) return;

  let html = `
    <h3>✏️ Редактировать клиента</h3>
    <input type="text" id="edit-first" value="${client.firstName}" placeholder="Имя" />
    <input type="text" id="edit-last" value="${client.lastName}" placeholder="Фамилия" />
    <input type="text" id="edit-phone" value="${client.phone}" placeholder="Телефон" />
    <button onclick="saveEditedClient('${id}')">Сохранить</button>
    <button onclick="deleteClient('${id}')" style="background:#ff3b30;">🗑 Удалить клиента</button>
    <button onclick="openClients()">Отмена</button>
  `;

  openModal(html);
}

async function saveEditedClient(id) {
  const firstName = document.getElementById('edit-first').value.trim();
  const lastName = document.getElementById('edit-last').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();

  if (!firstName) {
    alert('Укажите имя');
    return;
  }

  const client = clients.find(c => c.id === id);
  if (client) {
    client.firstName = firstName;
    client.lastName = lastName;
    client.phone = phone;
    await saveClients();
    showNotification('Клиент обновлён!');
    closeModal();
    openClients();
  }
}

async function deleteClient(id) {
  if (!confirm('Удалить клиента и все его записи?')) return;
  clients = clients.filter(c => c.id !== id);
  records = records.filter(r => r.clientId !== id);
  await saveClients();
  localforage.setItem('records', records);
  showNotification('Клиент удалён!');
  closeModal();
  openClients();
}

// === УСЛУГИ ===
function openServices() {
  sortServices();
  let listHtml = '';
  if (services.length > 0) {
    listHtml = '<div class="stats-list">';
    services.forEach(s => {
      listHtml += `
        <div class="service-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
          <span>${s.name} — ${s.price} ₽ <small>(${s.usageCount || 0})</small></span>
          <button onclick="editService('${s.id}')" style="background:#ff9500;padding:4px 8px;font-size:14px;">✏️</button>
        </div>
      `;
    });
    listHtml += '</div>';
  }

  let html = `
    <h3>🛠 Мои услуги</h3>
    ${listHtml}
  `;

  openModal(html);
  setView('services');
}

function openAddServiceForm() {
  let html = `
    <h3>➕ Новая услуга</h3>
    <input type="text" id="service-name" placeholder="Название услуги" />
    <input type="number" id="service-price" placeholder="Стоимость" />
    <button onclick="addService()">Сохранить</button>
    <button onclick="openServices()">Отмена</button>
  `;
  openModal(html);
}

async function addService() {
  const name = document.getElementById('service-name').value.trim();
  const price = parseFloat(document.getElementById('service-price').value);
  if (!name || isNaN(price)) {
    alert('Укажите название и стоимость');
    return;
  }
  const newService = {
    id: Date.now().toString(),
    name,
    price
  };
  services.push(newService);
  await saveServices();
  showNotification('Услуга сохранена!');
  closeModal();
  openServices();
}

async function editService(id) {
  const service = services.find(s => s.id === id);
  if (!service) return;

  let html = `
    <h3>✏️ Редактировать услугу</h3>
    <input type="text" id="edit-name" value="${service.name}" placeholder="Название" />
    <input type="number" id="edit-price" value="${service.price}" placeholder="Стоимость" />
    <button onclick="saveEditedService('${id}')">Сохранить</button>
    <button onclick="deleteService('${id}')" style="background:#ff3b30;">🗑 Удалить услугу</button>
    <button onclick="openServices()">Отмена</button>
  `;

  openModal(html);
}

async function saveEditedService(id) {
  const name = document.getElementById('edit-name').value.trim();
  const price = parseFloat(document.getElementById('edit-price').value);
  if (!name || isNaN(price)) {
    alert('Заполните все поля');
    return;
  }

  const service = services.find(s => s.id === id);
  if (service) {
    service.name = name;
    service.price = price;
    await saveServices();
    showNotification('Услуга обновлена!');
    closeModal();
    openServices();
  }
}

async function deleteService(id) {
  if (!confirm('Удалить услугу и все её записи?')) return;
  services = services.filter(s => s.id !== id);
  records = records.filter(r => {
    if (r.serviceIds && r.serviceIds.includes(id)) return false;
    return true;
  });
  await saveServices();
  localforage.setItem('records', records);
  showNotification('Услуга удалена!');
  closeModal();
  openServices();
}

// === СТАТИСТИКА ===
function openStats() {
  const today = new Date();
  const todayStr = formatDate(today);

  let earnedIncome = 0;
  let plannedIncome = 0;
  let totalRecords = 0;
  let totalServices = 0;
  const serviceUsage = {};

  records.forEach(r => {
    const recordDate = new Date(r.date);
    const isPast = recordDate < today;
    const isFutureOrToday = recordDate >= today;

    const ids = r.serviceIds || [];
    totalRecords++;
    totalServices += ids.length;

    ids.forEach(id => {
      const service = getServiceById(id);
      if (isPast) {
        earnedIncome += service.price;
      }
      if (isFutureOrToday) {
        plannedIncome += service.price;
      }

      serviceUsage[id] = (serviceUsage[id] || 0) + 1;
    });
  });

  let topService = null;
  let maxCount = 0;
  for (const id in serviceUsage) {
    if (serviceUsage[id] > maxCount) {
      maxCount = serviceUsage[id];
      topService = id;
    }
  }

  let html = `<h3>📊 Статистика</h3>`;

  html += `<p><strong>Заработано:</strong> ${earnedIncome.toFixed(0)} ₽</p>`;
  html += `<p><strong>Планируется:</strong> ${plannedIncome.toFixed(0)} ₽</p>`;
  html += `<p><strong>Всего записей:</strong> ${totalRecords}</p>`;
  html += `<p><strong>Продано услуг:</strong> ${totalServices}</p>`;

  if (topService) {
    const s = getServiceById(topService);
    html += `<p>🔥 Самая популярная: <strong>${s.name}</strong> (${maxCount} раз)</p>`;
  }

  const yearly = {};
  records.forEach(r => {
    const year = r.date.substring(0, 4);
    if (!yearly[year]) yearly[year] = { income: 0, services: {} };

    const ids = r.serviceIds || [];
    ids.forEach(id => {
      const service = getServiceById(id);
      yearly[year].income += service.price;
      yearly[year].services[id] = (yearly[year].services[id] || 0) + 1;
    });
  });

  html += '<h4>По годам</h4><div class="stats-list">';
  Object.keys(yearly).sort().reverse().forEach(y => {
    const yData = yearly[y];
    let topInYear = null;
    let maxInYear = 0;
    for (const id in yData.services) {
      if (yData.services[id] > maxInYear) {
        maxInYear = yData.services[id];
        topInYear = id;
      }
    }
    const topName = topInYear ? getServiceById(topInYear).name : '—';
    html += `<div class="stats-item">${y}: ${yData.income.toFixed(0)} ₽<br><small>Популярная: ${topName}</small></div>`;
  });
  html += '</div>';

  openModal(html);
  setView('stats');
}

// === РЕЗЕРВНОЕ КОПИРОВАНИЕ ===
function exportBackup() {
  const backup = {
    records,
    services,
    clients,
    version: '1.0',
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `доходы_резерв_${formatDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('Резервная копия сохранена!');
}

async function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      if (!backup.records || !backup.services || !backup.clients) {
        alert('Неверный формат файла');
        return;
      }
      
      if (!confirm('Восстановить данные? Все текущие записи будут заменены.')) return;
      
      records = backup.records;
      services = backup.services;
      clients = backup.clients;
      
      await localforage.setItem('records', records);
      await localforage.setItem('services', services);
      await localforage.setItem('clients', clients);
      
      showNotification('Данные восстановлены!');
      closeModal();
      renderCalendar();
    } catch (err) {
      alert('Ошибка при загрузке файла');
      console.error(err);
    }
  };
  input.click();
}

function closeModal(e) {
  const modal = document.getElementById('modal');
  if (e && e.target !== modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
    setView('calendar');
  }, 300);
}

function updateTotalBar() {
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  let monthIncome = 0;
  records.forEach(r => {
    if (r.date.startsWith(monthKey)) {
      if (r.serviceIds && Array.isArray(r.serviceIds)) {
        r.serviceIds.forEach(id => {
          const svc = getServiceById(id);
          monthIncome += svc.price;
        });
      }
    }
  });

  document.getElementById('month-title').textContent = 
    `${monthNames[currentMonth]}: ${monthIncome.toFixed(0)} ₽`;
}

window.onload = init;