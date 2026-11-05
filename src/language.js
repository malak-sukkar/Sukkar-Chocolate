const LANGUAGE_KEY = 'sukkar-language';

const arabic = {
  'Home': 'الرئيسية', 'Our story': 'قصتنا', 'Gallery': 'المعرض', 'Reviews': 'آراء العملاء',
  'My order': 'طلباتي', 'Contact': 'تواصل معنا', 'Sign out': 'تسجيل الخروج', 'Sign in': 'تسجيل الدخول',
  'Register': 'إنشاء حساب', 'Make an order': 'اطلب الآن', 'Create a custom order': 'اطلب شوكولاتة مخصصة',
  'View gallery': 'شاهد المعرض', 'Handmade in Homs · Made with heart': 'صُنعت يدوياً في حمص بكل محبة',
  'Make a moment': 'اجعل لحظتك', 'a little': 'أكثر', 'sweeter.': 'حلاوة.',
  'Personalised chocolate and celebration treats, made by hand for the people and days you love.': 'شوكولاتة وحلويات مناسبات مخصصة، نصنعها يدوياً للأشخاص واللحظات التي تحبها.',
  '01 — Little things, lovingly made': '١ — تفاصيل صغيرة صُنعت بمحبة', 'Made to order in Sadad, Homs': 'تُحضّر حسب الطلب في صدد، حمص',
  'A little Sukkar goes a long way': 'قليل من سُكّر يصنع الكثير',
  'From a name spelled in chocolate to a whole celebration table, tell us what you have in mind. ': 'من اسم مكتوب بالشوكولاتة إلى طاولة احتفال كاملة، أخبرنا بما تفكر فيه. ',
  'We’ll make it yours.': 'وسنصنعه خصيصاً لك.', 'A thoughtful kind of sweet': 'حلاوة بتفاصيل مميزة',
  'Made by hand.': 'صُنع يدوياً.', 'Made for your moment.': 'لأجمل لحظاتك.',
  'Every order begins with your idea. We shape, decorate and finish each piece with care, so it feels just right for the person receiving it.': 'يبدأ كل طلب بفكرتك. نشكّل كل قطعة ونزيّنها بعناية لتكون هدية مثالية لمن تحب.',
  'Meet Sukkar': 'تعرّف على سُكّر', 'Made with care, one order at a time': 'عناية في كل طلب',
  'The days worth celebrating': 'لحظات تستحق الاحتفال', 'Sweetness for': 'حلاوة لكل', 'every occasion.': 'مناسبة.',
  'Explore all the treats': 'اكتشف كل الحلويات', 'Birthdays': 'أعياد الميلاد', 'Baby showers': 'استقبال المولود',
  'Just because': 'بلا مناسبة', 'A little extra happy': 'فرحة إضافية', 'For the newest arrival': 'للمولود الجديد', 'No reason needed': 'لأنك تستحق',
  'Your idea, our little workshop': 'فكرتك في ورشتنا الصغيرة', 'Tell us what': 'أخبرنا بما', 'you’re ': 'تتخيل.',
  'imagining.': 'تتخيل.', 'Send a description, a reference photo and your collection date. We’ll talk through the details and price together before anything is made.': 'أرسل وصفاً وصورة توضيحية وتاريخ الاستلام. سنتفق معاً على التفاصيل والسعر قبل بدء التحضير.',
  'Start a custom order': 'ابدأ طلباً مخصصاً', 'A few words or a full moodboard — either is lovely.': 'اكتب بضع كلمات أو أرفق صوراً لأفكارك.',
  'Little handmade moments,': 'لحظات صغيرة صُنعت يدوياً،', 'made to be shared.': 'لتُشاركها مع من تحب.',
  'Explore': 'اكتشف', 'The gallery': 'المعرض', 'Our story': 'قصتنا', 'Kind words': 'آراء العملاء',
  'Studio dashboard': 'لوحة الإدارة', 'Have a sweet idea?': 'لديك فكرة حلوة؟', 'Tell us what you’re dreaming of.': 'أخبرنا بما تتمنى.',
  'Create a custom order': 'اطلب شوكولاتة مخصصة', 'Find us': 'موقعنا', 'Instagram': 'إنستغرام', 'Facebook': 'فيسبوك',
  'Handmade with care, in Homs.': 'صُنع يدوياً بعناية في حمص.', 'The sweetest ': 'أجمل ', 'words.': 'الكلمات.',
  'Notes from our customers': 'من آراء عملائنا', 'A little note after a special day means the world to us.': 'كلماتكم بعد يوم مميز تعني لنا الكثير.',
  'No reviews yet. Be the first to share a little note.': 'لا توجد آراء بعد. كن أول من يشاركنا رأيه.',
  'Show less': 'عرض أقل', 'Show ': 'عرض ', ' more ': ' إضافية ', 'review': 'رأي', 'reviews': 'آراء',
  'Leave a little note': 'اترك لنا رأيك', 'How was your ': 'كيف كانت تجربتك مع ', 'Sukkar?': 'سُكّر؟',
  'Your name': 'اسمك', 'The name you’d like us to use': 'الاسم الذي تودّ ظهوره', 'Your rating': 'تقييمك',
  'Choose a star rating': 'اختر عدد النجوم', 'Your review': 'رأيك', 'Tell us what made it special…': 'أخبرنا ما الذي جعلها مميزة…',
  'Share your review': 'أرسل رأيك', 'Thank you — your review has been sent for approval.': 'شكراً لك، أُرسل رأيك للمراجعة.',
  'Thank you — your kind words have been added.': 'شكراً لك، تمت إضافة رأيك.',
  'A treat that starts with your idea': 'حلوى تبدأ بفكرتك', 'Let’s make it ': 'لنصنعها ', 'yours.': 'خصيصاً لك.',
  'Tell us what you’re picturing and when you’d like to collect it. You can add up to five reference photos.': 'أخبرنا بما تتخيله ومتى تود استلامه. يمكنك إضافة ما يصل إلى خمس صور توضيحية.',
  'Before you order': 'قبل الطلب', 'Sign in to ': 'سجّل الدخول ', 'make it yours.': 'لتصنع طلبك.',
  'Please sign in or register before sending a custom order request.': 'يرجى تسجيل الدخول أو إنشاء حساب قبل إرسال طلب مخصص.',
  'Your order details will be submitted securely with your account.': 'سيُحفظ طلبك بأمان ضمن حسابك.',
  'Preview mode: create a test account to try the order flow. Preview orders stay in this browser.': 'وضع تجريبي: أنشئ حساباً تجريبياً لتجربة الطلب. ستبقى الطلبات على هذا المتصفح.',
  'First name': 'الاسم الأول', 'Last name': 'اسم العائلة', 'Phone number': 'رقم الهاتف', 'Email address': 'البريد الإلكتروني',
  'Collection date': 'تاريخ الاستلام', 'Preferred collection time': 'وقت الاستلام المفضل', 'Choose a date': 'اختر التاريخ',
  'Choose a time': 'اختر الوقت', 'Choose a time between 10:00 AM and 10:00 PM.': 'اختر وقتاً بين 10:00 صباحاً و10:00 مساءً.',
  'Describe your idea': 'صِف فكرتك', 'Chocolate and filling, colours, message, size or occasion — share anything that helps us imagine it…': 'نوع الشوكولاتة والحشوة والألوان والعبارة والحجم أو المناسبة — اكتب كل ما يساعدنا على تخيلها…',
  'Any allergies or dietary requirements?': 'هل لديك حساسية أو متطلبات غذائية؟', 'No': 'لا', 'Yes': 'نعم',
  'Please tell us about any allergies or dietary requirements': 'يرجى ذكر الحساسية أو المتطلبات الغذائية', 'e.g. nuts, dairy, gluten': 'مثال: المكسرات، الحليب، الغلوتين',
  'Reference photos': 'صور توضيحية', '(up to 5)': '(حتى ٥ صور)', 'Photos are uploaded privately with your request.': 'تُرفع الصور بشكل خاص مع طلبك.',
  'Preview photos stay on this device and are not uploaded.': 'تبقى الصور التجريبية على هذا الجهاز ولا تُرفع.',
  'Sending request…': 'جارٍ إرسال الطلب…', 'Send order request': 'أرسل طلبك', 'Your request and photos are saved securely. You’ll receive an email and Sukkar will email you about the price before starting.': 'حُفظ طلبك وصورك بأمان. ستصلك رسالة تأكيد، وسنتواصل معك عبر البريد للاتفاق على السعر قبل البدء.',
  'Preview order saved only in this browser. Email sending requires the connected website setup.': 'حُفظ الطلب التجريبي في هذا المتصفح فقط. إرسال البريد يتطلب إعداد الموقع.',
  'Your request was saved — thank you!': 'تم حفظ طلبك، شكراً لك!', 'The order is saved, but its email could not be sent.': 'حُفظ الطلب، لكن تعذر إرسال رسالة البريد.',
  'A confirmation email has been sent to you, and Sukkar has received your request.': 'أُرسل إليك بريد تأكيد ووصل طلبك إلى سُكّر.', 'View my order': 'عرض طلبي',
  'A lovely little process': 'خطوات بسيطة', 'Tell us what you love': 'أخبرنا بما تحب', 'Share your idea, date and inspiration.': 'شاركنا فكرتك والتاريخ والصور.',
  'Agree the details': 'اتفق على التفاصيل', 'We’ll confirm the price together by email.': 'سنتفق معاً على السعر عبر البريد الإلكتروني.',
  'Collect and enjoy': 'استلم واستمتع', 'Pay when you collect your finished order.': 'ادفع عند استلام طلبك.',
  'We’re happy you’re here': 'سعداء بزيارتك', 'Let’s have a ': 'لنتبادل ', 'chat.': 'الحديث.',
  'Questions, a special request or a little chocolate curiosity? Send us a note.': 'لديك سؤال أو طلب خاص؟ أرسل لنا رسالة.',
  'Your message': 'رسالتك', 'How can we help?': 'كيف يمكننا مساعدتك؟', 'Sending email…': 'جارٍ إرسال البريد…', 'Send email': 'أرسل الرسالة',
  'Your message will be sent to Sukkar by email.': 'ستصل رسالتك إلى سُكّر عبر البريد الإلكتروني.',
  'Your email has been sent. We look forward to chatting.': 'تم إرسال رسالتك. نتطلع للتواصل معك.', 'Find Sukkar': 'موقع سُكّر',
  'Let’s make': 'لنصنع', 'something sweet.': 'شيئاً حلواً.', 'Follow along on Instagram': 'تابعنا على إنستغرام', 'Find us on Facebook': 'تابعنا على فيسبوك',
  'Orders are made by request. Please allow at least 3 days before collection.': 'تُحضّر الطلبات حسب الطلب. يرجى إتاحة ٣ أيام على الأقل قبل الاستلام.',
  'A warm welcome to Sukkar': 'أهلاً بك في سُكّر', 'Good to see you again': 'سعداء بعودتك', 'Create your account': 'أنشئ حسابك',
  'Welcome back': 'مرحباً بعودتك', 'A few details and you’ll be ready to order something sweet.': 'أدخل بعض التفاصيل لتكون جاهزاً لطلب شيء حلو.',
  'Sign in to see your orders and continue where you left off.': 'سجّل الدخول لمشاهدة طلباتك ومتابعتها.',
  'Preview account: saved only in this browser for testing. It is not a live account.': 'حساب تجريبي: يُحفظ على هذا المتصفح فقط وليس حساباً فعلياً.',
  'Password': 'كلمة المرور', 'At least 8 characters': '٨ أحرف على الأقل', 'Your password': 'كلمة المرور', 'Please wait…': 'يرجى الانتظار…',
  'Already have an account?': 'لديك حساب بالفعل؟', 'New to Sukkar?': 'جديد في سُكّر؟', 'Create an account': 'أنشئ حساباً',
  'Your account is created. Check your email to confirm it, then sign in.': 'تم إنشاء حسابك. تحقق من بريدك لتأكيده ثم سجّل الدخول.',
  'A little order ': 'تحديث صغير عن ', 'update.': 'طلبك.', 'Your sweet requests': 'طلباتك الحلوة',
  'Orders submitted on this browser will appear here, with updates from Sukkar.': 'ستظهر هنا الطلبات المُرسلة من هذا المتصفح مع تحديثاتها من سُكّر.',
  'Orders submitted on this browser will appear here. We’ll agree the price and details together by email.': 'ستظهر هنا الطلبات المُرسلة من هذا المتصفح. سنتفق معاً على السعر والتفاصيل عبر البريد.',
  'Collection date': 'تاريخ الاستلام', 'Proposed price': 'السعر المقترح', 'Agreed price': 'السعر المتفق عليه', 'To be agreed': 'يُحدد لاحقاً',
  'Your preferred time': 'الوقت الذي تفضله', 'Preferred time': 'الوقت المفضل', 'Collection time': 'وقت الاستلام',
  'Awaiting price agreement': 'بانتظار الموافقة على السعر', 'Price declined': 'تم رفض السعر', 'Accepted': 'تمت الموافقة',
  'Sukkar has proposed this price:': 'اقترح سُكّر هذا السعر:', 'Accept price': 'أوافق على السعر', 'Reject price': 'أرفض السعر',
  'You declined this price. Sukkar will review your order.': 'رفضت هذا السعر. سيراجع سُكّر طلبك.', 'Ask about this order': 'استفسر عن هذا الطلب',
  'Sending email…': 'جارٍ إرسال البريد…', 'No orders on this device yet.': 'لا توجد طلبات على هذا الجهاز بعد.',
  'Tell us what you have in mind': 'أخبرنا بفكرتك', 'All treats': 'كل الحلويات', 'Chocolate': 'شوكولاتة',
  'Celebrations': 'مناسبات', 'Gift boxes': 'علب الهدايا', 'Seasonal': 'موسمية', 'Doughnuts & pops': 'دونات ومصاصات', 'Desserts & more': 'حلويات متنوعة',
  'Christmas': 'عيد الميلاد', 'Birthday': 'عيد ميلاد', 'Wedding': 'زفاف', 'Easter': 'عيد الفصح', 'Gifting': 'هدايا',
  'Baby shower': 'استقبال مولود', 'Anniversary': 'ذكرى سنوية', 'Mother’s Day': 'عيد الأم', 'Valentine’s Day': 'عيد الحب',
  'Personalise it': 'أضف لمستك', 'Made to order': 'يُحضّر حسب الطلب', 'Gift favourite': 'هدية مفضلة', 'Customer favourite': 'مفضلة العملاء',
  'More treats are on the way. Choose another collection to explore.': 'المزيد من الحلويات قريباً. اختر تصنيفاً آخر لاستكشافه.',
  'The hands behind the chocolate': 'الأيدي التي تصنع الشوكولاتة', 'A little story,': 'حكاية صغيرة،', 'made with love.': 'صُنعت بمحبة.',
  'Sukkar began with a love of chocolate and the happiness that comes with sharing something made just for you.': 'بدأت قصة سُكّر بحب الشوكولاتة وفرحة مشاركة شيء صُنع خصيصاً لك.',
  'Little details make a big difference': 'التفاصيل الصغيرة تصنع الفرق', 'Small beginnings.': 'بدايات بسيطة.', 'Sweet intentions.': 'ونوايا حلوة.',
  'Sukkar grew from a simple thought: the best gifts feel personal. A favourite colour, a name, a tiny detail only you would know — those are the things that make a treat feel like it belongs to someone.': 'انطلقت سُكّر من فكرة بسيطة: أجمل الهدايا هي الشخصية. لون مفضل أو اسم أو تفصيل صغير لا يعرفه سواك — هذه الأشياء تجعل الهدية مميزة.',
  'Today, each order is still made by hand. We listen to your idea, share the details and make your chocolate especially for the occasion.': 'حتى اليوم، نصنع كل طلب يدوياً. نستمع إلى فكرتك ونتفق على التفاصيل ونحضّر الشوكولاتة خصيصاً لمناسبتك.',
  'Thank you for being part of our story. We’re glad you’re here.': 'شكراً لأنك جزء من قصتنا. يسعدنا وجودك معنا.', 'Make something together': 'لنصنع شيئاً معاً',
  'A peek at the sweet things': 'نظرة على حلوياتنا', 'A gallery of': 'معرض من', 'little joys.': 'اللحظات الجميلة.',
  'Every piece is made to order, so colours and details can be tailored to your celebration.': 'نحضّر كل قطعة حسب الطلب، ويمكن اختيار الألوان والتفاصيل بما يناسب احتفالك.',
  'Filter gallery': 'تصفية المعرض', 'A Sukkar creation': 'من إبداع سُكّر',
  'Good to know': 'معلومات مفيدة', 'A few things before': 'أمور بسيطة قبل', 'the first bite.': 'أول لقمة.',
  'What about allergies?': 'ماذا عن الحساسية؟', 'Please include any allergies in your request. We’ll confirm the ingredients and whether we can accommodate them before you place your order.': 'يرجى ذكر أي حساسية في طلبك. سنؤكد المكونات وإمكانية مراعاتها قبل تأكيد الطلب.',
  'Ask us a question': 'اسألنا', 'A few kind words': 'كلمات لطيفة', 'From our table': 'من مائدتنا', 'to yours.': 'إلى مائدتك.',
  'Read all reviews': 'اقرأ كل الآراء', 'We’re waiting for the first kind words. Have ordered from Sukkar? We’d love to hear from you.': 'بانتظار أول رأي لطيف. هل طلبت من سُكّر؟ يسعدنا أن نسمع رأيك.',
  'Previous review': 'الرأي السابق', 'Next review': 'الرأي التالي', 'A little sweetness,': 'قليل من الحلاوة،', 'close to home.': 'قريب منك.',
  'Visit us in person or open the map for directions to our location.': 'زرنا أو افتح الخريطة لمعرفة طريق الوصول إلينا.', 'Get directions': 'احصل على الاتجاهات',
  'Could not complete that request. Please try again.': 'تعذر إكمال الطلب. يرجى المحاولة مجدداً.', 'Please choose a star rating.': 'يرجى اختيار تقييم بالنجوم.',
  'We could not submit your review. Please try again.': 'تعذر إرسال رأيك. يرجى المحاولة مجدداً.', 'Price proposed': 'تم اقتراح السعر',
  'Preparing': 'قيد التحضير', 'Ready for collection': 'جاهز للاستلام', 'Collected': 'تم الاستلام', 'Rejected': 'مرفوض',
  'Approve review': 'نشر الرأي', 'Publish review': 'نشر الرأي', 'Hide review': 'إخفاء الرأي', 'Delete review': 'حذف الرأي',
  'Price to agree': 'السعر المقترح', 'Collection time to send': 'وقت الاستلام للإرسال', 'Accept order': 'قبول الطلب', 'Reject order': 'رفض الطلب',
  'Mark as collected': 'تحديد كمُستلم', 'Send price proposal': 'إرسال عرض السعر', 'Save changes': 'حفظ التغييرات',
  'Sukkar email': 'بريد سُكّر الإلكتروني', 'Address': 'العنوان', 'Map location (address or coordinates)': 'موقع الخريطة (العنوان أو الإحداثيات)',
  'Add a category': 'أضف تصنيفاً', 'e.g. Graduation': 'مثال: التخرج', 'Add a name, description and category for the photos you upload.': 'أضف اسماً ووصفاً وتصنيفاً للصور التي ترفعها.',
  'Describe the treat, colours, details or occasion…': 'صِف الحلوى أو الألوان أو التفاصيل أو المناسبة…', 'The email address or password is incorrect.': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Ask about a custom version': 'استفسر عن تصميم مخصص', 'No star rating provided': 'لم يُضف تقييم بالنجوم',
  'star': 'نجمة', 'stars': 'نجوم', 'Could not load photo previews. Check Supabase Storage permissions.': 'تعذر تحميل معاينة الصور.',
  'Loading photo previews…': 'جارٍ تحميل معاينة الصور…', 'None attached': 'لا توجد صور مرفقة', 'photo': 'صورة', 'photos': 'صور',
  'All reviews': 'كل الآراء', 'New reviews': 'آراء جديدة', 'Hide all reviews': 'إخفاء كل الآراء', 'Show all reviews': 'عرض كل الآراء',
  'Customer requests': 'طلبات العملاء', 'Orders': 'الطلبات', 'Customer notes': 'آراء العملاء', 'Account security': 'أمان الحساب',
  'Admin sign-in details': 'بيانات دخول الإدارة', 'Public details': 'معلومات التواصل', 'Keep in touch': 'ابقَ على تواصل',
  'Gallery collections': 'تصنيفات المعرض', 'Categories': 'التصنيفات', 'Gallery images': 'صور المعرض', 'Add a photo': 'أضف صورة',
  'Photo name': 'اسم الصورة', 'Photo category': 'تصنيف الصورة', 'Photo description': 'وصف الصورة', 'Choose photos': 'اختر الصور',
  'Admin dashboard': 'لوحة الإدارة', 'Home location': 'موقع المتجر', 'Show password': 'إظهار كلمة المرور', 'Hide password': 'إخفاء كلمة المرور',
  'Hour': 'الساعة', 'Minute': 'الدقيقة', 'AM or PM': 'صباحاً أو مساءً', 'Previous month': 'الشهر السابق', 'Next month': 'الشهر التالي'
};

export const getLanguage = () => localStorage.getItem(LANGUAGE_KEY) === 'ar' ? 'ar' : 'en';
export const setLanguage = (language) => {
  localStorage.setItem(LANGUAGE_KEY, language === 'ar' ? 'ar' : 'en');
  window.dispatchEvent(new Event('sukkar-language-change'));
};

const translations = { ar: Object.fromEntries(Object.entries(arabic).map(([key, value]) => [key.trim(), value.trim()])) };
const textRecords = new WeakMap();
const attributeRecords = new WeakMap();
const translateValue = (source, language) => language === 'ar' ? translations.ar[source.trim()] : undefined;

export function localizeDocument(language = getLanguage()) {
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.parentElement || node.parentElement.closest('script,style,svg')) continue;
    const old = textRecords.get(node);
    const current = node.nodeValue;
    const source = old && current === old.translated ? old.source : current;
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    const key = source.trim();
    const translated = language === 'ar' ? translations.ar[key] : undefined;
    const next = translated === undefined ? source : `${leading}${translated}${trailing}`;
    textRecords.set(node, { source, translated: next });
    if (current !== next) node.nodeValue = next;
  }

  const elements = document.body.querySelectorAll('[placeholder],[aria-label],[title],[alt]');
  for (const element of elements) {
    let records = attributeRecords.get(element);
    if (!records) { records = new Map(); attributeRecords.set(element, records); }
    for (const attribute of ['placeholder', 'aria-label', 'title', 'alt']) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const old = records.get(attribute);
      const source = old && current === old.translated ? old.source : current;
      const translated = language === 'ar' ? translations.ar[source.trim()] : undefined;
      const next = translated === undefined ? source : translated;
      records.set(attribute, { source, translated: next });
      if (current !== next) element.setAttribute(attribute, next);
    }
  }
}
