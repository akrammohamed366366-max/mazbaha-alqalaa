# Data model v2 (Firebase Spark plan: no Cloud Functions, no Cloud Storage)

All money is an integer in EGP. Timestamps are Firestore Timestamps. The rules file is the authority: if anything here disagrees with it, the rules win.

## settings/restaurant  (public read; write: permission settings_manage)
nameAr, phone, whatsapp, address, hours {open, close}, isOrderingOpen (bool), closedMessage, minOrder (int),
deliveryEnabled (bool), pickupEnabled (bool),
paymentMethods { cod: bool, transfer: bool },
transferInstructions (text shown at checkout, e.g. the Vodafone Cash / InstaPay number),
zones: map zoneId -> { name, fee (int), active (bool), sortOrder }

## menu/current  (ONE document, public read; write: permission menu_manage)
categories: [ { id, name, sortOrder, active } ]
items: [ { id, categoryId, name, description, imageUrl, tags[], sortOrder, active, available, featured,
           variants: [ { id, label, price } ] } ]
offers: [ { id, title, subtitle, imageUrl, price, active, sortOrder } ]
updatedAt
The whole menu lives in one document so a visitor costs 1 read instead of 60. Every edit is a transaction on this document (read, change one array element, write back). Hard limits in the rules: 40 categories, 200 items, 20 offers. Keep the document under 1 MB (short descriptions, imageUrl is a URL, never base64).

## users/{uid}  (customer profile; owner read/write; admin read)
name, phone, email (lowercase, equals the Auth email), addresses[], createdAt, lastLoginAt, lastOrderAt (set only by the order transaction)

## staff/{uid}  (written only by admins; first admin created by hand in the Console)
name, email, role ('admin' | 'staff'), preset (label: admin | manager | cashier | kitchen | driver | custom),
permissions { orders_view, orders_manage, orders_create, payments_confirm, assign_driver, kitchen, driver,
              menu_manage, reports_view, settings_manage }  (booleans, missing = false),
active (bool), createdAt, createdBy, updatedAt
role 'admin' has every permission and is the only one who can edit staff.

## orders/{id}  (created by the client in a transaction; rules validate it)
orderNumber, ownerId (uid, null for phone orders), branchId 'main', source (web | phone),
customer {name, phone}, items[] {itemId, name, variantId, variantLabel, unitPrice, qty, lineTotal, note},
subtotal, deliveryFee, total,
delivery {type: delivery|pickup, zoneId, zoneName, address {street, building, floor, apartment, landmark}},
notes, paymentMethod (cod | transfer), transferRef (only for transfer), paymentStatus (unpaid | paid),
status (new | accepted | preparing | ready | out_for_delivery | delivered | cancelled),
statusLog[] {status, at, by}, cancelReason, driverId, driverName, createdAt, updatedAt

## counters/orders  (order numbers)
{ value, lastOrderId }. The admin creates it once with value 1000 (the dashboard setup button). Each order transaction increments it by exactly 1 and writes the new number into the order.

## Permissions (Arabic labels used in the UI)
orders_view عرض الطلبات | orders_manage إدارة الطلبات (قبول، رفض، تغيير الحالة، إلغاء) | orders_create تسجيل طلب تليفوني |
payments_confirm تأكيد التحصيل والتحويلات | assign_driver تعيين سواق للطلبات | kitchen شاشة المطبخ |
driver شاشة السواق (طلباته فقط) | menu_manage إدارة المنيو والعروض | reports_view عرض التقارير |
settings_manage تعديل الإعدادات
Presets: مدير = orders_view, orders_manage, orders_create, payments_confirm, assign_driver, menu_manage, reports_view.
كاشير = orders_view, orders_manage, orders_create, payments_confirm, assign_driver. مطبخ = kitchen. سواق = driver. مخصص = whatever the admin ticks.
