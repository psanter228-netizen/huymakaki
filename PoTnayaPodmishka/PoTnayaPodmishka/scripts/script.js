// ============================================================
//  🔥 НАСТРОЙКА FIREBASE (ваш конфиг)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAgvj_iqTpvZlTUq4DDLxs2onW4wSvX4DI",
  authDomain: "yhnjrmf.firebaseapp.com",
  projectId: "yhnjrmf",
  storageBucket: "yhnjrmf.firebasestorage.app",
  messagingSenderId: "240938759036",
  appId: "1:240938759036:web:cb08f8c70bdcda45272af9",
  measurementId: "G-Q258K8KL4Q"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
//  РАБОТА С ЗАКАЗАМИ (Firestore)
// ============================================================
const ORDERS_COLLECTION = 'orders';

// Получить все заказы (сортировка по дате, новые сверху)
async function getOrders() {
  const snapshot = await db.collection(ORDERS_COLLECTION)
    .orderBy('timestamp', 'desc')
    .get();
  const orders = [];
  snapshot.forEach(doc => {
    orders.push({ id: doc.id, ...doc.data() });
  });
  return orders;
}

// Добавить заказ
async function addOrder(orderData) {
  const docRef = await db.collection(ORDERS_COLLECTION).add({
    ...orderData,
    date: new Date().toLocaleString('ru-RU'),
    status: 'new',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

// Обновить статус заказа
async function updateOrderStatus(id, newStatus) {
  await db.collection(ORDERS_COLLECTION).doc(id).update({ status: newStatus });
}

// Удалить заказ
async function deleteOrder(id) {
  await db.collection(ORDERS_COLLECTION).doc(id).delete();
}

// ============================================================
//  МОДАЛЬНЫЕ ОКНА
// ============================================================
function openOrderModal(btn) {
  const card = btn.closest('.tour-card');
  const tourName = card.dataset.tour || card.querySelector('h3').innerText;
  document.getElementById('orderTour').value = tourName;
  document.getElementById('orderTourDisplay').value = tourName;
  document.getElementById('orderModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Закрытие по клику на фон
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});

// ============================================================
//  ОБРАБОТЧИК ФОРМЫ ЗАКАЗА (асинхронный)
// ============================================================
document.getElementById('orderForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const tour = document.getElementById('orderTour').value;
  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const email = document.getElementById('orderEmail').value.trim();
  const comment = document.getElementById('orderComment').value.trim();

  if (!name || !phone) {
    alert('Пожалуйста, заполните имя и телефон.');
    return;
  }

  try {
    await addOrder({ tour, name, phone, email, comment });
    alert('✅ Заявка отправлена! Мы свяжемся с вами.');
    closeModal('orderModal');
    document.getElementById('orderForm').reset();
  } catch (error) {
    console.error('Ошибка при отправке заказа:', error);
    alert('❌ Произошла ошибка. Попробуйте позже.');
  }
});

// ============================================================
//  АДМИН-ПАНЕЛЬ
// ============================================================
const ADMIN_PASSWORD = 'admin123';

function openAdminLogin() {
  document.getElementById('adminLoginModal').classList.add('active');
  document.getElementById('adminPassword').value = '';
}

document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASSWORD) {
    closeModal('adminLoginModal');
    openAdminPanel();
  } else {
    alert('❌ Неверный пароль!');
  }
});

async function openAdminPanel() {
  document.getElementById('adminPanelModal').classList.add('active');
  await renderAdminOrders();
}

function logoutAdmin() {
  closeModal('adminPanelModal');
}

// ----- ОТОБРАЖЕНИЕ ЗАКАЗОВ (асинхронное) -----
async function renderAdminOrders() {
  const container = document.getElementById('adminOrdersContainer');
  container.innerHTML = '<p style="text-align:center; color:#888;">Загрузка...</p>';

  try {
    const orders = await getOrders();

    if (orders.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#888;">Пока нет заказов.</p>';
      return;
    }

    let html = `
      <table class="admin-table">
        <thead><tr>
          <th>Тур</th><th>Клиент</th><th>Телефон</th><th>Email</th>
          <th>Дата</th><th>Статус</th><th>Действия</th>
        </tr></thead>
        <tbody>
    `;

    orders.forEach(order => {
      const statusMap = {
        new: { class: 'new', text: 'Новый' },
        processing: { class: 'processing', text: 'В обработке' },
        done: { class: 'done', text: 'Завершён' }
      };
      const st = statusMap[order.status] || statusMap.new;

      html += `
        <tr>
          <td><strong>${order.tour}</strong></td>
          <td>${order.name}</td>
          <td>${order.phone}</td>
          <td>${order.email || '—'}</td>
          <td>${order.date}</td>
          <td><span class="admin-status ${st.class}">${st.text}</span></td>
          <td class="admin-actions">
            <button onclick="changeStatus('${order.id}', 'new')" title="Новый">🟦</button>
            <button onclick="changeStatus('${order.id}', 'processing')" title="В обработке">🟧</button>
            <button onclick="changeStatus('${order.id}', 'done')" title="Завершён">🟩</button>
            <button onclick="deleteOrderAction('${order.id}')" class="delete-btn" title="Удалить">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    container.innerHTML = '<p style="color:red;">❌ Не удалось загрузить заказы. Проверьте консоль.</p>';
  }
}

// ----- ИЗМЕНЕНИЕ СТАТУСА -----
async function changeStatus(id, newStatus) {
  try {
    await updateOrderStatus(id, newStatus);
    await renderAdminOrders(); // обновляем таблицу
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    alert('❌ Не удалось изменить статус.');
  }
}

// ----- УДАЛЕНИЕ ЗАКАЗА -----
async function deleteOrderAction(id) {
  if (confirm('Удалить заказ?')) {
    try {
      await deleteOrder(id);
      await renderAdminOrders();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('❌ Не удалось удалить заказ.');
    }
  }
}

// ============================================================
//  БУРГЕР-МЕНЮ, ШАПКА, ПАРАЛЛАКС, АНИМАЦИИ
// ============================================================
const burger = document.getElementById('burger');
const navMenu = document.getElementById('navMenu');
burger.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});
document.querySelectorAll('.nav-menu a').forEach(link => {
  link.addEventListener('click', () => navMenu.classList.remove('active'));
});

const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
});

const bannerBg = document.getElementById('bannerBg');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (bannerBg && scrollY < window.innerHeight) {
    bannerBg.style.transform = `translateY(${scrollY * 0.2}px)`;
  }
});

const fadeElements = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });
fadeElements.forEach(el => observer.observe(el));

// ============================================================
//  ФОТО-МОДАЛКА
// ============================================================
function openPhotoModal(imageSrc, caption) {
  const modal = document.getElementById('photoModal');
  const img = document.getElementById('photoModalImage');
  const cap = document.getElementById('photoModalCaption');
  img.src = imageSrc;
  img.alt = caption || 'Фото';
  cap.textContent = caption || '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
  document.getElementById('photoModal').classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('photoModal').addEventListener('click', function(e) {
  if (e.target === this) closePhotoModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closePhotoModal();
    document.querySelectorAll('.modal.active').forEach(modal => {
      if (modal.id !== 'photoModal') modal.classList.remove('active');
    });
  }
});

console.log('🔥 Firebase подключён! Заказы хранятся в облаке.');