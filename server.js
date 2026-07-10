const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = __dirname;
const DATASETS_DIR = path.join(ROOT_DIR, 'datasets');
const MEMBERS_FILE = path.join(DATASETS_DIR, 'Members.json');
const ORDERS_FILE = path.join(DATASETS_DIR, 'Orders.json');
const PRODUCT_REQUESTS_FILE = path.join(DATASETS_DIR, 'ProductRequest.json');
const SUPPORT_REQUESTS_FILE = path.join(DATASETS_DIR, 'SupportRequest.json');
const COMMUNITY_POSTS_FILE = path.join(DATASETS_DIR, 'CommunityPost.json');
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function readMembers() {
  const raw = await fs.readFile(MEMBERS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeMembers(members) {
  await fs.writeFile(MEMBERS_FILE, JSON.stringify(members, null, 2) + '\n', 'utf8');
}

async function readOrders() {
  const raw = await fs.readFile(ORDERS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeOrders(orders) {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2) + '\n', 'utf8');
}

async function readProductRequests() {
  const raw = await fs.readFile(PRODUCT_REQUESTS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeProductRequests(requests) {
  await fs.writeFile(PRODUCT_REQUESTS_FILE, JSON.stringify(requests, null, 2) + '\n', 'utf8');
}

async function readSupportRequests() {
  const raw = await fs.readFile(SUPPORT_REQUESTS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeSupportRequests(requests) {
  await fs.writeFile(SUPPORT_REQUESTS_FILE, JSON.stringify(requests, null, 2) + '\n', 'utf8');
}

async function readCommunityPosts() {
  const raw = await fs.readFile(COMMUNITY_POSTS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeCommunityPosts(posts) {
  await fs.writeFile(COMMUNITY_POSTS_FILE, JSON.stringify(posts, null, 2) + '\n', 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function paymentMethodLabel(method) {
  if (method === 'MOMO') return 'MoMo';
  if (method === 'BANK_QR') return 'BankTransfer';
  return 'COD';
}

function makeTrackingCode(orderId, method) {
  if (method === 'COD') return `GHN26BAK${orderId}`;
  if (method === 'MOMO') return `GHTK26BAK${orderId}`;
  return `SE26BAK${orderId}`;
}

function sameOrderId(order, orderId) {
  const id = String(orderId || '').trim();
  return String(order.OrderID || '') === id || String(order.PublicOrderCode || '') === id;
}

function nowString() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/members') {
    return sendJson(res, 200, await readMembers());
  }

  if (req.method === 'POST' && pathname === '/api/members/register') {
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.Email);
    const fullName = String(body.FullName || '').trim();
    const phone = String(body.Phone || '').trim();
    const password = String(body.Password || '');

    if (!fullName || !email || !phone || password.length < 6) {
      return sendJson(res, 400, { message: 'Thông tin đăng ký không hợp lệ.' });
    }

    const members = await readMembers();
    const emailExists = members.some(member => normalizeEmail(member.Email) === email);
    if (emailExists) {
      return sendJson(res, 409, { message: 'Email này đã được đăng ký.' });
    }

    const nextMemberId = members.reduce((max, member) => Math.max(max, Number(member.MemberID) || 0), 0) + 1;
    const nextCustomerId = members.reduce((max, member) => Math.max(max, Number(member.CustomerID) || 1000), 1000) + 1;
    const now = new Date().toISOString();
    const newMember = {
      MemberID: nextMemberId,
      CustomerID: nextCustomerId,
      FullName: fullName,
      Email: email,
      Phone: phone,
      Password: password,
      Role: 'Customer',
      Status: 'Active',
      CreatedAt: now,
      UpdatedAt: now
    };

    members.push(newMember);
    await writeMembers(members);
    return sendJson(res, 201, newMember);
  }

  if (req.method === 'PATCH' && pathname === '/api/members/password') {
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.Email);
    const password = String(body.Password || '');

    if (!email || password.length < 6) {
      return sendJson(res, 400, { message: 'Thông tin đặt lại mật khẩu không hợp lệ.' });
    }

    const members = await readMembers();
    const member = members.find(item => normalizeEmail(item.Email) === email);
    if (!member) return sendJson(res, 404, { message: 'Không tìm thấy tài khoản với email này.' });
    if (member.Status === 'Blocked') return sendJson(res, 403, { message: 'Tài khoản này đang bị khóa.' });

    member.Password = password;
    member.UpdatedAt = new Date().toISOString();
    await writeMembers(members);
    return sendJson(res, 200, member);
  }

  if (req.method === 'GET' && pathname === '/api/orders') {
    return sendJson(res, 200, await readOrders());
  }

  if (req.method === 'PATCH' && pathname.match(/^\/api\/orders\/[^/]+\/cancel$/)) {
    const orderId = decodeURIComponent(pathname.split('/')[3] || '');
    const body = await readJsonBody(req);
    const orders = await readOrders();
    const order = orders.find(item => sameOrderId(item, orderId));

    if (!order) {
      return sendJson(res, 404, { message: 'Không tìm thấy đơn hàng cần hủy.' });
    }

    if (order.OrderStatus === 'Cancelled') {
      return sendJson(res, 200, order);
    }

    const now = new Date().toISOString();
    order.OrderStatus = 'Cancelled';
    order.CancelledAt = now;
    order.CancelReason = String(body.reason || '').trim();
    order.TrackingCode = null;
    order.ShippingCarrier = null;
    order.Fulfillment = Object.assign({}, order.Fulfillment || {}, {
      PackedAt: null,
      SentDate: null,
      ReceivedDate: null,
      DeliveryStatus: 'Cancelled'
    });

    if (order.Payment) {
      order.Payment.PaymentStatus = 'Failed';
    }

    await writeOrders(orders);
    return sendJson(res, 200, order);
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await readJsonBody(req);
    const receiverName = String(body.fullname || body.ReceiverName || '').trim();
    const receiverPhone = String(body.phone || body.ReceiverPhone || '').trim();
    const shippingAddress = String(body.address || body.ShippingAddress || '').trim();
    const email = normalizeEmail(body.email || body.accountEmail);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!receiverName || !receiverPhone || !shippingAddress || items.length === 0) {
      return sendJson(res, 400, { message: 'Thông tin đơn hàng không hợp lệ.' });
    }

    const orders = await readOrders();
    const members = await readMembers();
    const matchedMember = email ? members.find(member => normalizeEmail(member.Email) === email) : null;
    const nextOrderId = orders.reduce((max, order) => Math.max(max, Number(order.OrderID) || 0), 8000) + 1;
    const nextPaymentId = orders.reduce((max, order) => Math.max(max, Number(order.Payment && order.Payment.PaymentID) || 0), 8200) + 1;
    const subtotal = Number(body.subtotal) || items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0);
    const discount = Number(body.discount) || 0;
    const total = Math.max(0, Number(body.total) || (subtotal - discount));
    const paymentMethod = paymentMethodLabel(body.paymentMethod);
    const now = new Date().toISOString();
    const orderItems = items.map((item, index) => {
      const quantity = Number(item.qty || item.Quantity) || 1;
      const unitPrice = Number(item.price || item.UnitPrice) || 0;
      return {
        OrderItemID: nextOrderId * 10 + index + 1,
        ProductID: Number(item.id || item.ProductID) || 0,
        ProductName: item.title || item.ProductName || 'Unnamed product',
        Quantity: quantity,
        UnitPrice: unitPrice,
        Subtotal: Number(item.subtotal || item.Subtotal) || unitPrice * quantity
      };
    });

    const newOrder = {
      OrderID: nextOrderId,
      PublicOrderCode: body.id || null,
      CustomerID: Number(body.CustomerID || (matchedMember && matchedMember.CustomerID)) || null,
      OrderDate: now,
      OrderStatus: 'Processing',
      TrackingCode: makeTrackingCode(nextOrderId, body.paymentMethod),
      ShippingCarrier: body.paymentMethod === 'BANK_QR' ? 'Shopee Express' : 'GHN',
      ShippingAddress: shippingAddress,
      ReceiverName: receiverName,
      ReceiverPhone: receiverPhone,
      ReceiverEmail: email || null,
      Notes: String(body.notes || '').trim(),
      CouponCode: body.couponCode || '',
      DiscountAmount: discount,
      OriginalSubtotal: subtotal,
      ShippingFee: 0,
      OrderItems: orderItems,
      Payment: {
        PaymentID: nextPaymentId,
        PaymentMethod: paymentMethod,
        PaymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
        PaymentDate: paymentMethod === 'COD' ? null : now,
        PaymentAmount: total,
        TransactionCode: paymentMethod === 'COD' ? null : `TXN${Date.now()}`
      },
      Fulfillment: {
        PackedAt: null,
        SentDate: null,
        ReceivedDate: null,
        DeliveryStatus: 'Pending'
      },
      ReturnRequest: null
    };

    orders.unshift(newOrder);
    await writeOrders(orders);
    return sendJson(res, 201, newOrder);
  }

  if (req.method === 'GET' && pathname === '/api/product-requests') {
    return sendJson(res, 200, await readProductRequests());
  }

  if (req.method === 'POST' && pathname === '/api/product-requests') {
    const body = await readJsonBody(req);
    const productName = String(body.ProductName || body.productName || '').trim();
    const email = normalizeEmail(body.Email || body.email);
    const note = String(body.Note || body.note || '').trim();

    if (!productName || !email) {
      return sendJson(res, 400, { message: 'Thông tin yêu cầu sản phẩm không hợp lệ.' });
    }

    const requests = await readProductRequests();
    const nextRequestId = requests.reduce((max, item) => Math.max(max, Number(item.RequestID) || 0), 0) + 1;
    const newRequest = {
      RequestID: nextRequestId,
      ProductName: productName,
      Email: email,
      Note: note,
      RequestStatus: 'New',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: null
    };

    requests.unshift(newRequest);
    await writeProductRequests(requests);
    return sendJson(res, 201, newRequest);
  }

  if (req.method === 'GET' && pathname === '/api/support-requests') {
    return sendJson(res, 200, await readSupportRequests());
  }

  if (req.method === 'POST' && pathname === '/api/support-requests') {
    const body = await readJsonBody(req);
    const customerName = String(body.CustomerName || body.customerName || '').trim();
    const customerEmail = normalizeEmail(body.CustomerEmail || body.customerEmail);
    const requestContent = String(body.RequestContent || body.requestContent || '').trim();
    const requestType = String(body.RequestType || body.requestType || 'Support').trim();

    if (!customerName || !customerEmail || !requestContent) {
      return sendJson(res, 400, { message: 'Thông tin yêu cầu hỗ trợ không hợp lệ.' });
    }

    const requests = await readSupportRequests();
    const nextRequestId = requests.reduce((max, item) => Math.max(max, Number(item.RequestID) || 0), 7000) + 1;
    const newRequest = {
      RequestID: nextRequestId,
      CustomerID: Number(body.CustomerID || body.customerId) || null,
      CustomerName: customerName,
      CustomerEmail: customerEmail,
      CustomerPhone: String(body.CustomerPhone || body.customerPhone || '').trim(),
      OrderID: Number(body.OrderID || body.orderId) || null,
      RequestType: requestType,
      RequestContent: requestContent,
      RequestStatus: 'Open',
      CreatedAt: new Date().toISOString(),
      ResolvedAt: null
    };

    requests.unshift(newRequest);
    await writeSupportRequests(requests);
    return sendJson(res, 201, newRequest);
  }

  if (req.method === 'GET' && pathname === '/api/community-posts') {
    return sendJson(res, 200, await readCommunityPosts());
  }

  if (req.method === 'POST' && pathname === '/api/community-posts') {
    const body = await readJsonBody(req);
    const content = String(body.Content || body.content || '').trim();
    const blogId = Number(body.BlogID || body.blogId) || null;

    if (!content || !blogId) {
      return sendJson(res, 400, { message: 'Thông tin bình luận blog không hợp lệ.' });
    }

    const posts = await readCommunityPosts();
    const nextPostId = posts.reduce((max, post) => Math.max(max, Number(post.PostID) || 0), 0) + 1;
    const newPost = {
      PostID: nextPostId,
      CustomerID: Number(body.CustomerID || body.customerId) || null,
      CustomerName: String(body.CustomerName || body.customerName || 'Khách hàng').trim(),
      CustomerEmail: normalizeEmail(body.CustomerEmail || body.customerEmail),
      AdminID: null,
      ParentPostID: null,
      BlogID: blogId,
      BlogTitle: String(body.BlogTitle || body.blogTitle || '').trim(),
      SourceType: 'BlogComment',
      Content: content,
      CreatedAt: nowString(),
      PostStatus: 'Published'
    };

    posts.push(newPost);
    await writeCommunityPosts(posts);
    return sendJson(res, 201, newPost);
  }

  if (req.method === 'POST' && pathname.match(/^\/api\/community-posts\/[^/]+\/replies$/)) {
    const parentPostId = Number(decodeURIComponent(pathname.split('/')[3] || ''));
    const body = await readJsonBody(req);
    const content = String(body.Content || body.content || '').trim();

    if (!parentPostId || !content) {
      return sendJson(res, 400, { message: 'Thông tin trả lời không hợp lệ.' });
    }

    const posts = await readCommunityPosts();
    const parent = posts.find(post => Number(post.PostID) === parentPostId);
    if (!parent) {
      return sendJson(res, 404, { message: 'Không tìm thấy bình luận cần trả lời.' });
    }

    const nextPostId = posts.reduce((max, post) => Math.max(max, Number(post.PostID) || 0), 0) + 1;
    const reply = {
      PostID: nextPostId,
      CustomerID: null,
      CustomerName: null,
      CustomerEmail: null,
      AdminID: Number(body.AdminID || body.adminId) || 1,
      ParentPostID: parentPostId,
      BlogID: parent.BlogID || null,
      BlogTitle: parent.BlogTitle || '',
      SourceType: parent.SourceType || 'BlogComment',
      Content: content,
      CreatedAt: nowString(),
      PostStatus: 'Published'
    };

    posts.push(reply);
    await writeCommunityPosts(posts);
    return sendJson(res, 201, reply);
  }

  return sendJson(res, 404, { message: 'API route not found.' });
}

async function serveStatic(req, res, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  
  // Cú pháp chuyển hướng chuẩn xác để trình duyệt nhận diện đúng đường dẫn file tĩnh
  if (decodedPath === '/') {
    res.writeHead(302, { 'Location': 'customer/index.html' });
    return res.end();
  }

  const filePath = path.normalize(path.join(ROOT_DIR, decodedPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const stat = await fs.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const data = await fs.readFile(finalPath);
    const ext = path.extname(finalPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('File not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname);
      return;
    }

    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { message: error.message || 'Internal server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`BakeIt server running at http://localhost:${PORT}`);
});
