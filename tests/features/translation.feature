Feature: Translation Testing
  As a user of the Matrix Delivery platform
  I want all UI elements to display correctly translated text
  So that I can use the application in my preferred language

  Background:
    Given I am using the production environment
    And I have a driver account "amr@driver.com" with password "besmillah"
    And I have a customer account "amr@customer.com" with password "besmillah"

  @translation @driver @login
  Scenario Outline: Driver login page translations in <language>
    Given I am on the login page
    When I switch to "<language>" language
    Then the "Sign In" button should display "<signIn>" in "<language>"
    And the "Create Account" button should display "<createAccount>" in "<language>"
    And the "Email" field label should display "<email>" in "<language>"
    And the "Password" field label should display "<password>" in "<language>"
    And the "Don't have an account?" text should display "<dontHaveAccount>" in "<language>"

    Examples:
      | language | signIn     | createAccount    | email  | password | dontHaveAccount       |
      | en       | Sign In    | Create Account   | Email  | Password | Don't have an account? |
      | ar       | تسجيل الدخول | إنشاء حساب جديد | البريد الإلكتروني | كلمة المرور | ليس لديك حساب؟     |
      | es       | Iniciar Sesión | Crear Cuenta    | Correo Electrónico | Contraseña | ¿No tienes cuenta?    |
      | fr       | Se Connecter | Créer un Compte | E-mail | Mot de Passe | Vous n'avez pas de compte ? |
      | zh       | 登录       | 创建账户         | 电子邮件 | 密码     | 还没有账户？          |
      | de       | Anmelden   | Konto Erstellen  | E-Mail | Passwort | Haben Sie noch kein Konto? |
      | pt       | Entrar     | Criar Conta      | E-mail | Senha    | Não tem uma conta?    |
      | ru       | Войти      | Создать аккаунт  | Электронная почта | Пароль | У вас нет аккаунта?   |
      | ja       | サインイン   | アカウント作成    | メールアドレス | パスワード | アカウントをお持ちですか？ |
      | tr       | Giriş Yap  | Hesap Oluştur    | E-posta | Şifre    | Hesabınız yok mu?     |
      | ur       | سائن ان کریں | اکاؤنٹ بنائیں    | ای میل | پاس ورڈ | کیا آپ کا اکاؤنٹ نہیں ہے؟ |
      | hi       | साइन इन करें | खाता बनाएं      | ईमेल  | पासवर्ड | क्या आपके पास खाता नहीं है? |

  @translation @customer @login
  Scenario Outline: Customer login page translations in <language>
    Given I am on the login page
    When I switch to "<language>" language
    And I select customer role
    Then the "Sign In" button should display "<signIn>" in "<language>"
    And the "Create Account" button should display "<createAccount>" in "<language>"
    And the "Customer" role option should display "<customer>" in "<language>"
    And the "Driver" role option should display "<driver>" in "<language>"

    Examples:
      | language | signIn     | createAccount    | customer | driver  |
      | en       | Sign In    | Create Account   | Customer | Driver  |
      | ar       | تسجيل الدخول | إنشاء حساب جديد | عميل    | سائق   |
      | es       | Iniciar Sesión | Crear Cuenta    | Cliente  | Conductor |
      | fr       | Se Connecter | Créer un Compte | Client   | Chauffeur |
      | zh       | 登录       | 创建账户         | 客户     | 司机    |
      | de       | Anmelden   | Konto Erstellen  | Kunde    | Fahrer  |
      | pt       | Entrar     | Criar Conta      | Cliente  | Motorista |
      | ru       | Войти      | Создать аккаунт  | Клиент   | Водитель |
      | ja       | サインイン   | アカウント作成    | 顧客     | ドライバー |
      | tr       | Giriş Yap  | Hesap Oluştur    | Müşteri  | Sürücü  |
      | ur       | سائن ان کریں | اکاؤنٹ بنائیں    | کسٹمر   | ڈرائیور |
      | hi       | साइन इन करें | खाता बनाएं      | ग्राहक   | ड्राइवर |

  @translation @driver @dashboard
  Scenario Outline: Driver dashboard translations in <language>
    Given I am logged in as driver "amr@driver.com" with password "besmillah"
    When I switch to "<language>" language
    Then the "Active Orders" section should display "<activeOrders>" in "<language>"
    And the "Available Bids" section should display "<availableBids>" in "<language>"
    And the "My History" section should display "<myHistory>" in "<language>"
    And the "Update Location" button should display "<updateLocation>" in "<language>"

    Examples:
      | language | activeOrders   | availableBids    | myHistory   | updateLocation   |
      | en       | Active Orders  | Available Bids   | My History  | Update Location  |
      | ar       | الطلبات النشطة | العروض المتاحة   | سجلي       | تحديث الموقع    |
      | es       | Pedidos Activos | Ofertas Disponibles | Mi Historial | Actualizar Ubicación |
      | fr       | Commandes Actives | Offres Disponibles | Mon Historique | Mettre à Jour la Localisation |
      | zh       | 活跃订单       | 可用报价          | 我的历史     | 更新位置         |
      | de       | Aktive Bestellungen | Verfügbare Angebote | Mein Verlauf | Standort Aktualisieren |
      | pt       | Pedidos Ativos | Ofertas Disponíveis | Meu Histórico | Atualizar Localização |
      | ru       | Активные заказы | Доступные предложения | Моя история | Обновить местоположение |
      | ja       | アクティブ注文   | 利用可能な入札     | 履歴        | 位置情報を更新    |
      | tr       | Aktif Siparişler | Mevcut Teklifler | Geçmişim    | Konumu Güncelle  |
      | ur       | فعال آرڈرز     | دستیاب بولیاں     | میری تاریخ  | لوکیشن اپ ڈیٹ کریں |
      | hi       | सक्रिय ऑर्डर   | उपलब्ध बोली      | मेरा इतिहास | स्थान अपडेट करें |

  @translation @customer @dashboard
  Scenario Outline: Customer dashboard translations in <language>
    Given I am logged in as customer "amr@customer.com" with password "besmillah"
    When I switch to "<language>" language
    Then the "My Orders" section should display "<myOrders>" in "<language>"
    And the "Create New Order" button should display "<createOrder>" in "<language>"
    And the "Track Order" link should display "<trackOrder>" in "<language>"

    Examples:
      | language | myOrders   | createOrder      | trackOrder    |
      | en       | My Orders  | Create New Order | Track Order   |
      | ar       | طلباتي     | إنشاء طلب جديد  | تتبع الطلب   |
      | es       | Mis Pedidos | Crear Nuevo Pedido | Rastrear Pedido |
      | fr       | Mes Commandes | Créer une Nouvelle Commande | Suivre la Commande |
      | zh       | 我的订单     | 创建新订单        | 跟踪订单      |
      | de       | Meine Bestellungen | Neue Bestellung Erstellen | Bestellung Verfolgen |
      | pt       | Meus Pedidos | Criar Novo Pedido | Rastrear Pedido |
      | ru       | Мои заказы  | Создать новый заказ | Отследить заказ |
      | ja       | マイ注文     | 新規注文作成      | 注文を追跡     |
      | tr       | Siparişlerim | Yeni Sipariş Oluştur | Siparişi Takip Et |
      | ur       | میرے آرڈرز   | نیا آرڈر بنائیں   | آرڈر ٹریک کریں |
      | hi       | मेरे ऑर्डर   | नया ऑर्डर बनाएं  | ऑर्डर ट्रैक करें |

  @translation @order @creation
  Scenario Outline: Order creation form translations in <language>
    Given I am logged in as customer "amr@customer.com" with password "besmillah"
    When I navigate to create order page
    And I switch to "<language>" language
    Then the "Order Title" field should display "<orderTitle>" in "<language>"
    And the "Description" field should display "<description>" in "<language>"
    And the "Package Weight" field should display "<packageWeight>" in "<language>"
    And the "Estimated Value" field should display "<estimatedValue>" in "<language>"
    And the "Pickup Location" section should display "<pickupLocation>" in "<language>"
    And the "Delivery Location" section should display "<deliveryLocation>" in "<language>"
    And the "Publish Order" button should display "<publishOrder>" in "<language>"

    Examples:
      | language | orderTitle   | description | packageWeight     | estimatedValue    | pickupLocation  | deliveryLocation | publishOrder   |
      | en       | Order Title  | Description | Package Weight (kg) | Estimated Value ($) | Pickup Location | Delivery Location | Publish Order  |
      | ar       | عنوان الطلب | الوصف      | وزن الطرد (كجم)   | القيمة المقدرة ($) | موقع الاستلام  | موقع التسليم   | نشر الطلب     |
      | es       | Título del Pedido | Descripción | Peso del Paquete (kg) | Valor Estimado ($) | Ubicación de Recogida | Ubicación de Entrega | Publicar Pedido |
      | fr       | Titre de la Commande | Description | Poids du Colis (kg) | Valeur Estimée ($) | Lieu de Ramassage | Lieu de Livraison | Publier la Commande |
      | zh       | 订单标题     | 描述        | 包裹重量 (kg)      | 预估价值 ($)      | 取货地点        | 交付地点        | 发布订单       |
      | de       | Bestellungstitel | Beschreibung | Paketgewicht (kg) | Geschätzter Wert ($) | Abholort | Lieferort | Bestellung Veröffentlichen |
      | pt       | Título do Pedido | Descrição | Peso do Pacote (kg) | Valor Estimado ($) | Local de Coleta | Local de Entrega | Publicar Pedido |
      | ru       | Название заказа | Описание | Вес посылки (кг) | Ориентировочная стоимость ($) | Место получения | Место доставки | Опубликовать заказ |
      | ja       | 注文タイトル   | 説明        | 荷物の重量 (kg)    | 推定価値 ($)      | 集荷場所        | 配送場所        | 注文を公開     |
      | tr       | Sipariş Başlığı | Açıklama | Paket Ağırlığı (kg) | Tahmini Değer ($) | Alış Yeri | Teslimat Yeri | Siparişi Yayınla |
      | ur       | آرڈر کا عنوان | تفصیل     | پیکیج کا وزن (kg) | تخمینی قیمت ($) | پک اپ لوکیشن   | ڈیلیوری لوکیشن | آرڈر شائع کریں |
      | hi       | ऑर्डर का शीर्षक | विवरण     | पैकेज का वजन (kg) | अनुमानित मूल्य ($) | पिकअप स्थान    | डिलीवरी स्थान   | ऑर्डर प्रकाशित करें |

  @translation @navigation @language
  Scenario Outline: Language switcher translations in <language>
    Given I am on any page
    When I switch to "<language>" language
    Then the language selector should show current language as "<currentLanguage>"
    And the language dropdown should contain all supported languages

    Examples:
      | language | currentLanguage |
      | en       | English         |
      | ar       | العربية        |
      | es       | Español         |
      | fr       | Français        |
      | zh       | 中文            |
      | de       | Deutsch         |
      | pt       | Português       |
      | ru       | Русский         |
      | ja       | 日本語          |
      | tr       | Türkçe          |
      | ur       | اردو            |
      | hi       | हिंदी           |

  @translation @common @elements
  Scenario Outline: Common UI elements translations in <language>
    Given I am logged in as driver "amr@driver.com" with password "besmillah"
    When I switch to "<language>" language
    Then the "Loading..." text should display "<loading>" in "<language>"
    And the "Error" message should display "<error>" in "<language>"
    And the "Success" message should display "<success>" in "<language>"
    And the "Cancel" button should display "<cancel>" in "<language>"
    And the "Save" button should display "<save>" in "<language>"

    Examples:
      | language | loading        | error  | success | cancel | save  |
      | en       | Loading...     | Error  | Success | Cancel | Save  |
      | ar       | جارٍ التحميل... | خطأ   | نجاح   | إلغاء  | حفظ  |
      | es       | Cargando...    | Error  | Éxito   | Cancelar | Guardar |
      | fr       | Chargement...  | Erreur | Succès  | Annuler | Sauvegarder |
      | zh       | 加载中...      | 错误   | 成功    | 取消    | 保存  |
      | de       | Laden...       | Fehler | Erfolg  | Abbrechen | Speichern |
      | pt       | Carregando...  | Erro   | Sucesso | Cancelar | Salvar |
      | ru       | Загрузка...    | Ошибка | Успех   | Отмена  | Сохранить |
      | ja       | 読み込み中...   | エラー | 成功    | キャンセル | 保存  |
      | tr       | Yükleniyor...  | Hata   | Başarılı | İptal  | Kaydet |
      | ur       | لوڈ ہو رہا ہے... | خرابی | کامیابی | منسوخ کریں | محفوظ کریں |
      | hi       | लोड हो रहा है... | त्रुटि | सफलता  | रद्द करें | सहेजें |

  @translation @validation @messages
  Scenario Outline: Validation and error messages translations in <language>
    Given I am on the order creation page
    When I switch to "<language>" language
    And I try to submit an empty form
    Then the "Order title is required" error should display "<orderTitleRequired>" in "<language>"
    And the "Price is required" error should display "<priceRequired>" in "<language>"
    And the "All fields required" message should display "<allFieldsRequired>" in "<language>"

    Examples:
      | language | orderTitleRequired        | priceRequired     | allFieldsRequired   |
      | en       | Order title is required   | Price is required | All fields required |
      | ar       | عنوان الطلب مطلوب        | السعر مطلوب       | جميع الحقول مطلوبة |
      | es       | El título del pedido es requerido | El precio es requerido | Todos los campos son requeridos |
      | fr       | Le titre de la commande est requis | Le prix est requis | Tous les champs sont requis |
      | zh       | 订单标题为必填项          | 价格为必填项       | 所有字段均为必填项   |
      | de       | Bestellungstitel ist erforderlich | Preis ist erforderlich | Alle Felder sind erforderlich |
      | pt       | Título do pedido é obrigatório | Preço é obrigatório | Todos os campos são obrigatórios |
      | ru       | Название заказа обязательно | Цена обязательна | Все поля обязательны |
      | ja       | 注文タイトルは必須です     | 価格は必須です      | すべてのフィールドが必須です |
      | tr       | Sipariş başlığı gerekli   | Fiyat gerekli      | Tüm alanlar zorunlu |
      | ur       | آرڈر کا عنوان ضروری ہے    | قیمت ضروری ہے     | تمام فیلڈز ضروری ہیں |
      | hi       | ऑर्डर का शीर्षक आवश्यक है | मूल्य आवश्यक है    | सभी फ़ील्ड आवश्यक हैं |

  @translation @status @indicators
  Scenario Outline: Order status translations in <language>
    Given I am logged in as driver "amr@driver.com" with password "besmillah"
    When I switch to "<language>" language
    Then the status "Pending Bids" should display "<pendingBids>" in "<language>"
    And the status "Accepted" should display "<accepted>" in "<language>"
    And the status "Picked Up" should display "<pickedUp>" in "<language>"
    And the status "In Transit" should display "<inTransit>" in "<language>"
    And the status "Delivered" should display "<delivered>" in "<language>"

    Examples:
      | language | pendingBids    | accepted | pickedUp    | inTransit   | delivered |
      | en       | Pending Bids   | Accepted | Picked Up   | In Transit  | Delivered |
      | ar       | في انتظار العروض | مقبول  | تم الاستلام | قيد التوصيل | تم التسليم |
      | es       | Ofertas Pendientes | Aceptado | Recogido | En Tránsito | Entregado |
      | fr       | Offres en Attente | Accepté | Ramassé | En Transit | Livré |
      | zh       | 等待报价        | 已接受   | 已取货      | 运输中      | 已交付    |
      | de       | Ausstehende Angebote | Akzeptiert | Abgeholt | Unterwegs | Geliefert |
      | pt       | Ofertas Pendentes | Aceito | Coletado | Em Trânsito | Entregue |
      | ru       | Ожидают предложений | Принят | Получен | В пути | Доставлен |
      | ja       | 入札待ち         | 承認済み | 集荷済み    | 配送中      | 配送完了  |
      | tr       | Teklif Bekleniyor | Kabul Edildi | Alındı | Yolda | Teslim Edildi |
      | ur       | بولیاں زیر التواء | قبول کر لیا گیا | پک اپ کر لیا گیا | راستے میں | ڈیلیور کر دیا گیا |
      | hi       | बोली लंबित      | स्वीकार किया गया | पिकअप किया गया | मार्ग में | डिलीवर किया गया |
