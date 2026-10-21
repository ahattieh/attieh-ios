/* Amira IPTV — interface languages (ar is the source; en / es / fr translate the rendered text).
   Exact text matches first, then known phrases inside longer strings. Titles, names and plots are left alone. */
var I18N = (function () {
  var L = ['en', 'es', 'fr'];
  /* [arabic, english, spanish, french] */
  var W = [
    // navigation & screens
    ['الرئيسية', 'Home', 'Inicio', 'Accueil'], ['القنوات', 'Channels', 'Canales', 'Chaînes'], ['الأفلام', 'Movies', 'Películas', 'Films'],
    ['المسلسلات', 'Series', 'Series', 'Séries'], ['قائمتي', 'My List', 'Mi lista', 'Ma liste'], ['بحث', 'Search', 'Buscar', 'Recherche'],
    ['الإعدادات', 'Settings', 'Ajustes', 'Paramètres'], ['مباشر', 'LIVE', 'EN VIVO', 'EN DIRECT'], ['بث مباشر', 'Live broadcast', 'Emisión en vivo', 'Diffusion en direct'],
    ['أهلاً بك', 'Welcome', 'Bienvenido', 'Bienvenue'], ['أهلاً', 'Welcome', 'Hola', 'Bonjour'],
    ['🎬 الأفلام', '🎬 Movies', '🎬 Películas', '🎬 Films'], ['🎞 المسلسلات', '🎞 Series', '🎞 Series', '🎞 Séries'], ['📺 القنوات', '📺 Channels', '📺 Canales', '📺 Chaînes'],
    ['⚙ الإعدادات', '⚙ Settings', '⚙ Ajustes', '⚙ Paramètres'], ['⚙ أضف اشتراكك', '⚙ Add your subscription', '⚙ Añade tu suscripción', '⚙ Ajoutez votre abonnement'],
    // home
    ['أهلاً بك في Attieh', 'Welcome to Attieh', 'Bienvenido a Attieh', 'Bienvenue sur Attieh'], ['لا توجد قنوات بعد', 'No channels yet', 'Aún no hay canales', 'Pas encore de chaînes'],
    ['أضف رابط قائمتك أو حساب Xtream من الإعدادات.', 'Add your playlist link or Xtream account in Settings.', 'Añade tu lista o cuenta Xtream en Ajustes.', 'Ajoutez votre liste ou compte Xtream dans Paramètres.'],
    ['اختر من القنوات أو الأفلام أو المسلسلات — وأي شي بتشوفه بيظهر هون.', 'Pick from channels, movies or series — whatever you watch shows up here.', 'Elige canales, películas o series: lo que veas aparecerá aquí.', 'Choisissez chaînes, films ou séries — ce que vous regardez apparaît ici.'],
    ['هذه بثوث اختبار مفتوحة للتجربة فقط — أضف اشتراكك من الإعدادات.', 'These are open test streams only — add your subscription in Settings.', 'Son emisiones de prueba — añade tu suscripción en Ajustes.', 'Ce sont des flux de test — ajoutez votre abonnement dans Paramètres.'],
    ['تابع المشاهدة', 'Continue watching', 'Seguir viendo', 'Reprendre'], ['متابعة المشاهدة', 'Continue watching', 'Seguir viendo', 'Reprendre la lecture'],
    ['ابدأ المشاهدة', 'Start watching', 'Empezar a ver', 'Commencer'], ['شاهد الآن', 'Watch now', 'Ver ahora', 'Regarder'], ['شوهد مؤخراً', 'Recently watched', 'Vistos recientemente', 'Vus récemment'],
    ['🆕 أضيف مؤخراً', '🆕 Recently added', '🆕 Añadido recientemente', '🆕 Ajouts récents'], ['أفلامي ومسلسلاتي المفضلة', 'My favourite movies & series', 'Mis películas y series favoritas', 'Mes films et séries favoris'],
    ['قنواتي المفضلة', 'My favourite channels', 'Mis canales favoritos', 'Mes chaînes favorites'], ['عرض الكل', 'View all', 'Ver todo', 'Tout voir'],
    ['قائمتك فارغة. أي قناة أو فيلم بتشوفه بيظهر هون، وبتقدر تضيف للمفضلة بالزر', 'Your list is empty. Anything you watch shows up here; add favourites with the', 'Tu lista está vacía. Lo que veas aparecerá aquí; añade favoritos con el botón', 'Votre liste est vide. Ce que vous regardez apparaît ici ; ajoutez des favoris avec le bouton'],
    ['(أو F).', '(or F).', '(o F).', '(ou F).'], ['مسح سجل المشاهدة', 'Clear watch history', 'Borrar historial', "Effacer l'historique"],
    ['★ في المفضلة', '★ In favourites', '★ En favoritos', '★ Dans les favoris'], ['☆ أضف للمفضلة', '☆ Add to favourites', '☆ Añadir a favoritos', '☆ Ajouter aux favoris'],
    ['أُضيفت إلى المفضلة', 'Added to favourites', 'Añadido a favoritos', 'Ajouté aux favoris'], ['أُزيلت من المفضلة', 'Removed from favourites', 'Quitado de favoritos', 'Retiré des favoris'],
    // browse
    ['كل الفئات', 'All categories', 'Todas las categorías', 'Toutes les catégories'], ['★ المثبّتة', '★ Pinned', '★ Fijadas', '★ Épinglées'],
    ['كل القنوات', 'All channels', 'Todos los canales', 'Toutes les chaînes'], ['كل الأفلام', 'All movies', 'Todas las películas', 'Tous les films'], ['كل المسلسلات', 'All series', 'Todas las series', 'Toutes les séries'],
    ['فئات مخفية', 'Hidden categories', 'Categorías ocultas', 'Catégories masquées'], ['ما في فئات أطفال بهالقسم', 'No kids categories here', 'No hay categorías infantiles aquí', 'Aucune catégorie enfants ici'],
    ['ملف أطفال 👶', 'Kids profile 👶', 'Perfil infantil 👶', 'Profil enfant 👶'], ['ما في قنوات', 'No channels', 'Sin canales', 'Aucune chaîne'],
    ['لا يوجد محتوى في هذه الفئة', 'Nothing in this category', 'No hay contenido en esta categoría', 'Rien dans cette catégorie'], ['تعذّر تحميل الفئة:', 'Could not load category:', 'No se pudo cargar la categoría:', 'Impossible de charger la catégorie :'],
    ['ابحث في القنوات بالاسم أو الرقم…', 'Search channels by name or number…', 'Busca canales por nombre o número…', 'Rechercher une chaîne par nom ou numéro…'],
    ['ابحث في الأفلام…', 'Search movies…', 'Buscar películas…', 'Rechercher des films…'], ['ابحث في المسلسلات…', 'Search series…', 'Buscar series…', 'Rechercher des séries…'],
    ['ابحث باسم القناة أو رقمها…', 'Search by name or channel number…', 'Busca por nombre o número…', 'Rechercher par nom ou numéro…'],
    ['اكتب اسم القناة أو الفيلم أو رقم القناة.', 'Type a channel name, movie or channel number.', 'Escribe un canal, película o número.', 'Tapez une chaîne, un film ou un numéro.'],
    ['ما في نتائج — جرّب جزء ثاني من الاسم', 'No results — try another part of the name', 'Sin resultados: prueba otra parte del nombre', 'Aucun résultat — essayez une autre partie du nom'],
    ['جارِ البحث…', 'Searching…', 'Buscando…', 'Recherche…'], ['جارِ البحث في كل الأقسام…', 'Searching all sections…', 'Buscando en todas las secciones…', 'Recherche dans toutes les sections…'],
    ['جارِ البحث في باقي الفئات', 'searching remaining categories', 'buscando en el resto de categorías', 'recherche dans les autres catégories'], ['جارِ تجهيز البحث…', 'preparing search…', 'preparando búsqueda…', 'préparation de la recherche…'],
    ['نتائج', 'Results', 'Resultados', 'Résultats'], ['من نفس الفئة', 'More like this', 'Más de esta categoría', 'Dans la même catégorie'],
    ['الترتيب: أبجدي', 'Sort: A–Z', 'Orden: A–Z', 'Tri : A–Z'], ['الترتيب: الأحدث', 'Sort: Newest', 'Orden: Recientes', 'Tri : Récents'], ['الترتيب: الأعلى تقييماً', 'Sort: Top rated', 'Orden: Mejor valoradas', 'Tri : Mieux notés'],
    ['الترتيب: الافتراضي', 'Sort: Default', 'Orden: Predeterminado', 'Tri : Par défaut'], ['الترتيب: رقم القناة', 'Sort: Channel number', 'Orden: Número de canal', 'Tri : Numéro de chaîne'],
    ['أبجدي', 'A–Z', 'A–Z', 'A–Z'], ['الأحدث', 'Newest', 'Recientes', 'Récents'], ['الأعلى تقييماً', 'Top rated', 'Mejor valoradas', 'Mieux notés'], ['الافتراضي', 'Default', 'Predeterminado', 'Par défaut'], ['رقم القناة', 'Channel number', 'Número de canal', 'Numéro de chaîne'],
    ['📅 دليل البرامج', '📅 TV guide', '📅 Guía de TV', '📅 Guide TV'], ['عرض القنوات', 'Show channels', 'Ver canales', 'Voir les chaînes'],
    ['جارِ التحميل…', 'Loading…', 'Cargando…', 'Chargement…'], ['جارٍ…', 'Working…', 'Procesando…', 'En cours…'],
    ['تثبيت', 'pin', 'fijar', 'épingler'], ['إخفاء', 'hide', 'ocultar', 'masquer'], ['قفل', 'lock', 'bloquear', 'verrouiller'],
    ['ثُبّتت', 'Pinned', 'Fijada', 'Épinglée'], ['في أعلى القائمة', 'at the top of the list', 'arriba de la lista', 'en haut de la liste'], ['أُزيلت', 'Removed', 'Quitada', 'Retirée'],
    ['من القوائم المثبّتة', 'from pinned lists', 'de las fijadas', 'des épinglées'], ['انخفت', 'Hidden', 'Ocultada', 'Masquée'], ['بتلاقيها تحت بـ', 'find it below in', 'la encontrarás abajo en', 'retrouvez-la plus bas dans'],
    ['👁 رجعت', '👁 Restored', '👁 Restaurada', '👁 Restaurée'], ['الفئة مقفولة', 'Category locked', 'Categoría bloqueada', 'Catégorie verrouillée'], ['اكتب رمز القفل', 'enter the PIN', 'introduce el PIN', 'saisissez le code'],
    // live preview / guide
    ['وقّف على أي قناة لتشوفها هون', 'Rest on any channel to preview it here', 'Detente en un canal para verlo aquí', 'Arrêtez-vous sur une chaîne pour la voir ici'],
    ['وقّف على قناة أو اكبس عليها لتشتغل هون', 'Rest on a channel or press it to play here', 'Detente o pulsa un canal para verlo aquí', 'Arrêtez-vous ou appuyez sur une chaîne pour la lire ici'],
    ['OK على نفس القناة أو على الشاشة الصغيرة = شاشة كاملة · CH+/CH− تقليب', 'OK on the same channel or the small screen = full screen · CH+/CH− zap', 'OK en el mismo canal o la pantalla pequeña = pantalla completa · CH+/CH− cambiar', 'OK sur la même chaîne ou le petit écran = plein écran · CH+/CH− zapper'],
    ['الآن:', 'Now:', 'Ahora:', 'Maintenant :'], ['التالي:', 'Next:', 'Siguiente:', 'Ensuite :'], ['التالي', 'Next', 'Siguiente', 'Suivant'],
    ['المعاينة المصغّرة للقنوات:', 'Channel mini preview:', 'Vista previa de canales:', 'Aperçu des chaînes :'], ['المعاينة المصغّرة للقنوات', 'Channel mini preview', 'Vista previa de canales', 'Aperçu des chaînes'],
    ['تلقائي لما توقف', 'Automatic when you rest', 'Automática al detenerte', 'Automatique à l’arrêt'], ['بس لما أكبس OK', 'Only when I press OK', 'Solo al pulsar OK', 'Seulement avec OK'],
    ['جارِ تحميل دليل البرامج…', 'Loading TV guide…', 'Cargando guía de TV…', 'Chargement du guide TV…'], ['دليل البرامج جاهز', 'TV guide ready', 'Guía de TV lista', 'Guide TV prêt'],
    ['تعذّر تحميل دليل البرامج:', 'Could not load TV guide:', 'No se pudo cargar la guía:', 'Impossible de charger le guide :'], ['لا يوجد رابط دليل برامج', 'No TV guide link', 'Sin enlace de guía', 'Aucun lien de guide TV'],
    ['تحديث دليل البرامج', 'Refresh TV guide', 'Actualizar guía de TV', 'Actualiser le guide TV'], ['انتهى العرض', 'Ended', 'Terminado', 'Terminé'],
    // cards & series
    ['متبقٍ', 'left', 'restante', 'restant'], ['تابع', 'Continue', 'Seguir', 'Reprendre'], ['التالية:', 'Next:', 'Siguiente:', 'Suivant :'], ['التالية', 'Next', 'Siguiente', 'Suivant'],
    ['الحلقة', 'Episode', 'Episodio', 'Épisode'], ['الحلقات', 'Episodes', 'Episodios', 'Épisodes'], ['حلقة', 'episodes', 'episodios', 'épisodes'], ['مواسم', 'seasons', 'temporadas', 'saisons'],
    ['الموسم', 'Season', 'Temporada', 'Saison'], ['مسلسل', 'Series', 'Serie', 'Série'], ['فيلم', 'Movie', 'Película', 'Film'], ['قناة', 'channel', 'canal', 'chaîne'],
    ['✓ شوهدت', '✓ Watched', '✓ Vista', '✓ Vu'], ['شوهدت', 'Watched', 'Vista', 'Vu'], ['وصلت إلى', 'You reached', 'Llegaste a', 'Vous êtes à'],
    ['شاهد', 'Watch', 'Ver', 'Regarder'], ['تشغيل', 'Play', 'Reproducir', 'Lire'], ['ليس مسلسل', 'Not a series', 'No es una serie', "Ce n'est pas une série"],
    ['جارِ تحميل الحلقات…', 'Loading episodes…', 'Cargando episodios…', 'Chargement des épisodes…'], ['تعذّر تحميل الحلقات:', 'Could not load episodes:', 'No se pudieron cargar los episodios:', 'Impossible de charger les épisodes :'],
    ['لا توجد حلقات', 'No episodes', 'Sin episodios', 'Aucun épisode'], ['جارِ تحميل التفاصيل…', 'Loading details…', 'Cargando detalles…', 'Chargement des détails…'],
    ['إخراج:', 'Director:', 'Dirección:', 'Réalisation :'], ['بطولة:', 'Cast:', 'Reparto:', 'Avec :'], ['من البداية', 'From the start', 'Desde el inicio', 'Depuis le début'],
    ['تابع من', 'Continue from', 'Seguir desde', 'Reprendre à'], ['▶ تابع من', '▶ Continue from', '▶ Seguir desde', '▶ Reprendre à'], ['ما في معلومات', 'No info', 'Sin información', "Pas d'infos"],
    // player
    ['التالية ⏭', 'Next ⏭', 'Siguiente ⏭', 'Suivant ⏭'], ['تخطي الشارة ⏭', 'Skip intro ⏭', 'Saltar intro ⏭', "Passer l'intro ⏭"], ['✂ الشارة', '✂ Intro', '✂ Intro', '✂ Intro'],
    ['✕ خروج', '✕ Exit', '✕ Salir', '✕ Quitter'], ['خروج', 'Exit', 'Salir', 'Quitter'], ['القناة السابقة', 'Previous channel', 'Canal anterior', 'Chaîne précédente'],
    ['الحلقة التالية', 'Next episode', 'Siguiente episodio', 'Épisode suivant'], ['▲▼ للتنقل · ◀▶ للاختيار · رجوع للإغلاق', '▲▼ move · ◀▶ choose · Back to close', '▲▼ mover · ◀▶ elegir · Atrás para cerrar', '▲▼ naviguer · ◀▶ choisir · Retour pour fermer'],
    ['OK للتشغيل الآن · رجوع للإلغاء', 'OK to play now · Back to cancel', 'OK para reproducir · Atrás para cancelar', 'OK pour lire · Retour pour annuler'],
    ['بدك تطلع من المشاهدة؟', 'Stop watching?', '¿Dejar de ver?', 'Arrêter la lecture ?'], ['اضغط رجوع مرة ثانية للخروج مباشرة', 'Press Back again to exit right away', 'Pulsa Atrás otra vez para salir', 'Appuyez encore sur Retour pour quitter'],
    ['بتقدر تكمل من نفس المكان لاحقاً', 'you can resume from the same spot later', 'podrás seguir desde el mismo punto', 'vous pourrez reprendre au même endroit'],
    ['تابع من حيث توقفت؟', 'Resume where you left off?', '¿Seguir donde lo dejaste?', 'Reprendre où vous étiez ?'], ['توقفت عند', 'You stopped at', 'Te detuviste en', 'Arrêté à'],
    ['إيقاف/تشغيل', 'Pause/Play', 'Pausa/Reproducir', 'Pause/Lecture'], ['ترجيع/تقديم', 'Rewind/Forward', 'Retroceder/Avanzar', 'Reculer/Avancer'], ['رجوع للخروج', 'Back to exit', 'Atrás para salir', 'Retour pour quitter'],
    ['تغيير القناة', 'change channel', 'cambiar canal', 'changer de chaîne'], ['الأرقام للانتقال', 'numbers to jump', 'números para saltar', 'chiffres pour aller'], ['المعلومات', 'Info', 'Info', 'Infos'],
    ['الصوت والترجمة والسرعة', 'Audio, subtitles & speed', 'Audio, subtítulos y velocidad', 'Audio, sous-titres et vitesse'], ['التالية/السابقة', 'next/previous', 'siguiente/anterior', 'suivant/précédent'],
    ['تحديد الشارة', 'mark intro', 'marcar intro', "marquer l'intro"], ['للمباشر', 'go live', 'al directo', 'en direct'], ['للعودة', 'to go back', 'para volver', 'pour revenir'],
    ['عن المباشر', 'behind live', 'detrás del directo', 'de retard sur le direct'], ['متأخر', 'Behind', 'Retraso', 'Retard'], ['عدت إلى البث المباشر', 'Back to live', 'De vuelta al directo', 'Retour au direct'],
    ['هذا البث لا يدعم التقديم والترجيع', 'This stream can’t be seeked', 'Esta emisión no permite avanzar/retroceder', 'Ce flux ne permet pas l’avance rapide'],
    ['تعذّر التشغيل. جرّب عنواناً آخر أو تأكد من الاشتراك.', 'Playback failed. Try another title or check your subscription.', 'No se pudo reproducir. Prueba otro título o revisa tu suscripción.', 'Lecture impossible. Essayez un autre titre ou vérifiez votre abonnement.'],
    ['رح أعيد المحاولة', 'retrying', 'reintentando', 'nouvel essai'], ['إعادة محاولة', 'Retry', 'Reintento', 'Nouvel essai'], ['بانتظار جاهزية المشغّل', 'Waiting for the player', 'Esperando al reproductor', 'En attente du lecteur'],
    ['هذه آخر حلقة متوفرة', 'This is the last episode available', 'Es el último episodio disponible', 'Dernier épisode disponible'], ['هذه أول حلقة', 'This is the first episode', 'Es el primer episodio', 'Premier épisode'],
    ['انتهت آخر حلقة متوفرة', 'Last available episode finished', 'Terminó el último episodio', 'Dernier épisode terminé'], ['ما في قناة سابقة', 'No previous channel', 'No hay canal anterior', 'Pas de chaîne précédente'],
    ['لا توجد قناة بالرقم', 'No channel number', 'No hay canal número', 'Aucune chaîne n°'], ['اضغط OK للانتقال · CH+ في أي وقت', 'Press OK to go · CH+ anytime', 'Pulsa OK para ir · CH+ cuando quieras', 'OK pour y aller · CH+ à tout moment'],
    ['اضغط أي زر للإلغاء', 'press any key to cancel', 'pulsa cualquier tecla para cancelar', "appuyez sur une touche pour annuler"],
    ['⏭ تم تخطي الشارة', '⏭ Intro skipped', '⏭ Intro saltada', '⏭ Intro passée'], ['لتخطي الشارة: حرّك المؤشر واكبس «✂ الشارة» تحت الفيديو، أو الزر', 'To skip the intro: move the pointer and press «✂ Intro» under the video, or the', 'Para saltar la intro: mueve el puntero y pulsa «✂ Intro», o el botón', "Pour passer l'intro : bougez le pointeur et appuyez sur « ✂ Intro », ou le bouton"],
    ['حدّدت بداية الشارة عند', 'Intro start marked at', 'Inicio de intro marcado en', "Début de l'intro marqué à"], ['اضغط مرة ثانية لما تخلص', 'press again when it ends', 'pulsa otra vez cuando termine', 'appuyez à nouveau à la fin'], ['أو الزر', 'or the button', 'o el botón', 'ou le bouton'],
    ['الشارة قصيرة جداً، جرّب مرة ثانية', 'Intro too short, try again', 'Intro demasiado corta, inténtalo de nuevo', 'Intro trop courte, réessayez'], ['تم تحديد الشارة:', 'Intro set:', 'Intro marcada:', 'Intro définie :'],
    ['رح تنطبق على كل حلقات', 'applies to every episode of', 'se aplicará a todos los episodios de', "s'appliquera à tous les épisodes de"], ['انمسحت الشارة', 'Intro cleared', 'Intro borrada', 'Intro effacée'],
    ['شارة هالمسلسل محددة', 'Intro set for this series', 'Intro definida para esta serie', 'Intro définie pour cette série'], ['✂ هون بتخلص الشارة', '✂ Intro ends here', '✂ La intro termina aquí', "✂ L'intro finit ici"],
    ['⚡ تخطّي تلقائي بكل الحلقات', '⚡ Auto-skip on every episode', '⚡ Saltar automáticamente siempre', '⚡ Passer automatiquement partout'], ['⏭ زر «تخطي الشارة» بس', '⏭ Only a «Skip intro» button', '⏭ Solo botón «Saltar intro»', '⏭ Seulement un bouton « Passer »'],
    ['تم — الشارة رح تتخطّى تلقائياً بكل الحلقات', 'Done — the intro will be skipped automatically', 'Hecho: la intro se saltará automáticamente', "C'est fait — l'intro sera passée automatiquement"], ['تم — رح يطلعلك زر تخطي الشارة', 'Done — you’ll get a Skip intro button', 'Hecho: verás un botón para saltar la intro', 'C’est fait — un bouton « Passer » apparaîtra'],
    ['تخطّي تلقائي', 'auto-skip', 'salto automático', 'saut auto'], ['زر تخطي', 'skip button', 'botón saltar', 'bouton passer'], ['الشارة:', 'Intro:', 'Intro:', 'Intro :'], ['غير محددة', 'not set', 'sin definir', 'non définie'],
    ['الصوت', 'Audio', 'Audio', 'Audio'], ['الترجمة', 'Subtitles', 'Subtítulos', 'Sous-titres'], ['ترجمة', 'Subtitles', 'Subtítulos', 'Sous-titres'], ['حجم الترجمة', 'Subtitle size', 'Tamaño de subtítulos', 'Taille des sous-titres'],
    ['سرعة التشغيل', 'Playback speed', 'Velocidad', 'Vitesse'], ['مؤقت النوم', 'Sleep timer', 'Temporizador', 'Minuterie'], ['الشاشة', 'Screen', 'Pantalla', 'Écran'], ['بدون', 'Off', 'No', 'Aucun'],
    ['صغير', 'Small', 'Pequeño', 'Petit'], ['متوسط', 'Medium', 'Mediano', 'Moyen'], ['كبير', 'Large', 'Grande', 'Grand'], ['كبير جداً', 'Extra large', 'Muy grande', 'Très grand'], ['عادي', 'Normal', 'Normal', 'Normal'],
    ['ما في ترجمة بالملف', 'No subtitles in this file', 'Sin subtítulos en el archivo', 'Pas de sous-titres dans ce fichier'], ['مسار', 'Track', 'Pista', 'Piste'], ['مسار واحد', 'Single track', 'Una pista', 'Piste unique'],
    ['عربي', 'Arabic', 'Árabe', 'Arabe'], ['إنجليزي', 'English', 'Inglés', 'Anglais'], ['فرنسي', 'French', 'Francés', 'Français'], ['إسباني', 'Spanish', 'Español', 'Espagnol'],
    ['تركي', 'Turkish', 'Turco', 'Turc'], ['ألماني', 'German', 'Alemán', 'Allemand'], ['هندي', 'Hindi', 'Hindi', 'Hindi'],
    ['انلغى مؤقت النوم', 'Sleep timer off', 'Temporizador cancelado', 'Minuterie annulée'], ['😴 رح يطفي بعد', '😴 Turning off in', '😴 Se apagará en', '😴 Arrêt dans'], ['دقيقة', 'min', 'min', 'min'],
    ['السيرفر ما سمح باتصال ثاني — رجعت المعاينة للوقت بس', 'Server refused a 2nd connection — preview shows time only', 'El servidor rechazó una 2.ª conexión: solo se muestra el tiempo', 'Le serveur a refusé une 2e connexion — aperçu de l’heure seulement'],
    ['آخر تقديم:', 'Last seek:', 'Último salto:', 'Dernier saut :'], ['قابل للتقديم:', 'Seekable:', 'Se puede avanzar:', 'Avance possible :'], ['المدة:', 'Duration:', 'Duración:', 'Durée :'], ['الوضع:', 'Mode:', 'Modo:', 'Mode :'],
    ['المشغّل:', 'Player:', 'Reproductor:', 'Lecteur :'], ['الوقت:', 'Time:', 'Tiempo:', 'Temps :'], ['محمّل:', 'Buffered:', 'Cargado:', 'Chargé :'], ['اتصالات:', 'Connections:', 'Conexiones:', 'Connexions :'],
    ['رفض المشغّل', 'Player refused', 'Reproductor rechazó', 'Lecteur refusé'], ['لا استجابة', 'No response', 'Sin respuesta', 'Pas de réponse'], ['إجبارية (قد تقطع الفيديو)', 'Forced (may interrupt video)', 'Forzada (puede cortar el vídeo)', 'Forcée (peut couper la vidéo)'],
    ['خلّيها تلقائي', 'Keep automatic', 'Automático', 'Automatique'], ['زر بدل التلقائي', 'Button instead of auto', 'Botón en vez de automático', 'Bouton au lieu d’auto'],
    // profiles
    ['مين عم يتفرّج؟', "Who's watching?", '¿Quién está viendo?', 'Qui regarde ?'], ['إضافة ملف', 'Add profile', 'Añadir perfil', 'Ajouter un profil'], ['أنا', 'Me', 'Yo', 'Moi'],
    ['تعديل الملف الشخصي', 'Edit profile', 'Editar perfil', 'Modifier le profil'], ['ملف شخصي جديد', 'New profile', 'Nuevo perfil', 'Nouveau profil'], ['الاسم', 'Name', 'Nombre', 'Nom'],
    ['صورة الملف الشخصي', 'Profile picture', 'Foto de perfil', 'Photo de profil'], ['لغة الملف الشخصي', 'Profile language', 'Idioma del perfil', 'Langue du profil'],
    ['اختر صورة الملف الشخصي', 'Choose a profile picture', 'Elige una foto de perfil', 'Choisissez une photo de profil'], ['اختر اللغة', 'Choose language', 'Elige idioma', 'Choisir la langue'],
    ['🗑 حذف الملف', '🗑 Delete profile', '🗑 Eliminar perfil', '🗑 Supprimer le profil'], ['حفظ', 'Save', 'Guardar', 'Enregistrer'], ['مثلاً: أحمد', 'e.g. Ahmad', 'p. ej. Ahmad', 'ex. Ahmad'],
    ['اكتب اسم للملف', 'Enter a profile name', 'Escribe un nombre', 'Saisissez un nom'], ['انحذف ملف', 'Deleted profile', 'Perfil eliminado', 'Profil supprimé'], ['تغيير الملف الشخصي', 'Switch profile', 'Cambiar perfil', 'Changer de profil'],
    // PIN / parental
    ['قفل الأهالي', 'Parental lock', 'Control parental', 'Contrôle parental'], ['تعيين رمز القفل', 'Set PIN', 'Definir PIN', 'Définir le code'], ['تغيير رمز القفل', 'Change PIN', 'Cambiar PIN', 'Changer le code'],
    ['إلغاء القفل', 'Remove lock', 'Quitar bloqueo', 'Retirer le verrou'], ['رمز القفل', 'PIN', 'PIN', 'Code'], ['رمز القفل الحالي', 'Current PIN', 'PIN actual', 'Code actuel'], ['رمز قفل جديد', 'New PIN', 'Nuevo PIN', 'Nouveau code'],
    ['4 أرقام', '4 digits', '4 dígitos', '4 chiffres'], ['أكّد الرمز', 'Confirm PIN', 'Confirma el PIN', 'Confirmez le code'], ['اكتبه مرة ثانية', 'Enter it again', 'Escríbelo otra vez', 'Saisissez-le à nouveau'],
    ['للتأكيد', 'to confirm', 'para confirmar', 'pour confirmer'], ['فتح', 'Unlock', 'Abrir', 'Ouvrir'], ['التالي', 'Next', 'Siguiente', 'Suivant'], ['إلغاء', 'Cancel', 'Cancelar', 'Annuler'],
    ['الرمز غلط، جرّب مرة ثانية', 'Wrong PIN, try again', 'PIN incorrecto, inténtalo de nuevo', 'Code incorrect, réessayez'], ['الرمزين مش متطابقين', "PINs don't match", 'Los PIN no coinciden', 'Les codes ne correspondent pas'],
    ['لازم يكون 4 أرقام', 'Must be 4 digits', 'Deben ser 4 dígitos', 'Doit contenir 4 chiffres'], ['لازم تعيّن رمز من 4 أرقام قبل ما تقفل', 'Set a 4‑digit PIN before locking', 'Define un PIN de 4 dígitos antes de bloquear', 'Définissez un code à 4 chiffres avant de verrouiller'],
    ['🔒 تم تعيين رمز القفل', '🔒 PIN set', '🔒 PIN definido', '🔒 Code défini'], ['🔓 انفتح القفل لحد ما تسكّر التطبيق', '🔓 Unlocked until you close the app', '🔓 Desbloqueado hasta cerrar la app', "🔓 Déverrouillé jusqu'à la fermeture"],
    ['انلغى قفل الأهالي', 'Parental lock removed', 'Control parental eliminado', 'Contrôle parental retiré'], ['ما في رمز قفل', 'No PIN set', 'No hay PIN', 'Aucun code'],
    ['🔒 انقفلت', '🔒 Locked', '🔒 Bloqueada', '🔒 Verrouillée'], ['🔓 انفتحت', '🔓 Unlocked', '🔓 Desbloqueada', '🔓 Déverrouillée'], ['بتحتاج الرمز لتنفتح', 'needs the PIN to open', 'necesita el PIN', 'nécessite le code'],
    ['لتغيير قفل', 'to change the lock on', 'para cambiar el bloqueo de', 'pour changer le verrou de'],
    ['🔒 فئات القنوات', '🔒 Channel categories', '🔒 Categorías de canales', '🔒 Catégories de chaînes'], ['🔒 فئات الأفلام', '🔒 Movie categories', '🔒 Categorías de películas', '🔒 Catégories de films'], ['🔒 فئات المسلسلات', '🔒 Series categories', '🔒 Categorías de series', '🔒 Catégories de séries'],
    ['ما في فئات بهالقسم لسا', 'No categories here yet', 'Aún no hay categorías', 'Pas encore de catégories'],
    ['اختار القسم، وبعدين اكبس OK على أي فئة لتقفلها أو تفتحها. أو من داخل القسم: وقّف على الفئة واكبس', 'Choose a section, then press OK on any category to lock or unlock it. Or inside a section: rest on a category and press', 'Elige una sección y pulsa OK en una categoría para bloquearla o desbloquearla. O dentro de la sección: detente en la categoría y pulsa', 'Choisissez une section, puis OK sur une catégorie pour la verrouiller. Ou dans la section : placez-vous sur la catégorie et appuyez sur'],
    ['أو 🔒 جنبها. الفئات المقفولة ما بتظهر بالرئيسية أو البحث، وبتحتاج الرمز لتنفتح (مرة وحدة لحد ما تسكّر التطبيق). لإخفاء فئة:', 'or 🔒 next to it. Locked categories are hidden from Home and Search and need the PIN (once until you close the app). To hide a category:', 'o 🔒 a su lado. Las categorías bloqueadas no aparecen en Inicio ni en Buscar y piden el PIN (una vez hasta cerrar la app). Para ocultar una categoría:', 'ou 🔒 à côté. Les catégories verrouillées sont masquées de l’accueil et de la recherche et demandent le code (une fois jusqu’à la fermeture). Pour masquer une catégorie :'],
    ['أو 👁.', 'or 👁.', 'o 👁.', 'ou 👁.'],
    // settings
    ['المظهر', 'Theme', 'Tema', 'Thème'], ['ليلي', 'Night', 'Noche', 'Nuit'], ['زمرّد', 'Emerald', 'Esmeralda', 'Émeraude'], ['ياقوت', 'Ruby', 'Rubí', 'Rubis'], ['محيط', 'Ocean', 'Océano', 'Océan'],
    ['بنفسجي', 'Violet', 'Violeta', 'Violet'], ['نهاري', 'Light', 'Claro', 'Clair'],
    ['قوائم التشغيل', 'Playlists', 'Listas', 'Listes'], ['اسم القائمة الجديدة (اختياري)', 'New playlist name (optional)', 'Nombre de la lista (opcional)', 'Nom de la liste (facultatif)'], ['مثلاً: اشتراك البيت', 'e.g. Home subscription', 'p. ej. Suscripción de casa', 'ex. Abonnement maison'],
    ['إضافة قائمة M3U', 'Add M3U playlist', 'Añadir lista M3U', 'Ajouter une liste M3U'], ['إضافة حساب Xtream Codes', 'Add Xtream Codes account', 'Añadir cuenta Xtream Codes', 'Ajouter un compte Xtream Codes'],
    ['رابط قائمة القنوات (M3U / M3U8)', 'Playlist link (M3U / M3U8)', 'Enlace de la lista (M3U / M3U8)', 'Lien de la liste (M3U / M3U8)'],
    ['رابط دليل البرامج EPG بصيغة XMLTV (اختياري، يدعم ‎.xml و ‎.xml.gz)', 'TV guide (EPG) XMLTV link (optional, .xml or .xml.gz)', 'Enlace de guía EPG XMLTV (opcional, .xml o .xml.gz)', 'Lien du guide EPG XMLTV (facultatif, .xml ou .xml.gz)'],
    ['إضافة وتشغيل', 'Add & play', 'Añadir y reproducir', 'Ajouter et lire'], ['عنوان السيرفر', 'Server address', 'Dirección del servidor', 'Adresse du serveur'], ['اسم المستخدم', 'Username', 'Usuario', "Nom d'utilisateur"],
    ['كلمة المرور', 'Password', 'Contraseña', 'Mot de passe'], ['إضافة وتسجيل الدخول', 'Add & sign in', 'Añadir e iniciar sesión', 'Ajouter et se connecter'], ['شغّالة', 'active', 'activa', 'active'],
    ['ما في قوائم بعد — أضف اشتراك Xtream أو رابط M3U تحت.', 'No playlists yet — add an Xtream account or M3U link below.', 'Aún no hay listas: añade una cuenta Xtream o un enlace M3U.', 'Aucune liste — ajoutez un compte Xtream ou un lien M3U ci-dessous.'],
    ['حذف', 'Delete', 'Eliminar', 'Supprimer'], ['رح تنحذف القائمة من التطبيق', 'The playlist will be removed from the app', 'La lista se eliminará de la app', "La liste sera supprimée de l'application"], ['انحذفت القائمة', 'Playlist deleted', 'Lista eliminada', 'Liste supprimée'],
    ['الاشتراك:', 'Subscription:', 'Suscripción:', 'Abonnement :'], ['ينتهي', 'expires', 'vence', 'expire'], ['بدون تاريخ انتهاء', 'no expiry date', 'sin fecha de vencimiento', "sans date d'expiration"], ['عدد الاتصالات المسموحة:', 'Allowed connections:', 'Conexiones permitidas:', 'Connexions autorisées :'],
    ['الاشتراك غير فعّال', 'Subscription inactive', 'Suscripción inactiva', 'Abonnement inactif'], ['مفتوح', 'open', 'abierto', 'ouvert'],
    ['إعدادات المشاهدة', 'Playback settings', 'Ajustes de reproducción', 'Paramètres de lecture'], ['التشغيل التلقائي للحلقة التالية', 'Autoplay next episode', 'Reproducir siguiente episodio', 'Lecture auto de l’épisode suivant'],
    ['التشغيل التلقائي للحلقة التالية:', 'Autoplay next episode:', 'Siguiente episodio automático:', 'Épisode suivant auto :'], ['فتح آخر قناة عند التشغيل', 'Open last channel on start', 'Abrir el último canal al iniciar', 'Ouvrir la dernière chaîne au démarrage'],
    ['فتح آخر قناة عند التشغيل:', 'Open last channel on start:', 'Abrir el último canal al iniciar:', 'Dernière chaîne au démarrage :'], ['معاينة الصورة على شريط الوقت', 'Timeline thumbnail preview', 'Vista previa en la barra de tiempo', 'Aperçu sur la barre de temps'],
    ['معاينة الصورة على شريط الوقت:', 'Timeline preview:', 'Vista previa en la barra:', 'Aperçu sur la barre :'], ['معلومات التشغيل', 'Playback info', 'Info de reproducción', 'Infos de lecture'], ['معلومات التشغيل فوق الفيديو:', 'Playback info overlay:', 'Info sobre el vídeo:', 'Infos sur la vidéo :'],
    ['المعاينة:', 'Preview:', 'Vista previa:', 'Aperçu :'], ['صورة (اتصال ثاني)', 'Picture (2nd connection)', 'Imagen (2.ª conexión)', 'Image (2e connexion)'], ['وقت بس (السيرفر رفض اتصال ثاني)', 'Time only (server refused 2nd connection)', 'Solo tiempo (el servidor rechazó la 2.ª conexión)', 'Heure seulement (2e connexion refusée)'],
    ['السيرفر رفض اتصال ثاني — الوقت بس', 'server refused a 2nd connection — time only', 'el servidor rechazó la 2.ª conexión: solo tiempo', '2e connexion refusée — heure seulement'],
    ['مفعّل', 'On', 'Activado', 'Activé'], ['مفعّلة', 'On', 'Activada', 'Activée'], ['متوقف', 'Off', 'Desactivado', 'Désactivé'], ['متوقفة', 'Off', 'Desactivada', 'Désactivée'], ['ظاهرة', 'Shown', 'Visible', 'Affichées'], ['مخفية', 'Hidden', 'Oculta', 'Masquées'],
    ['تحديث المحتوى', 'Refresh content', 'Actualizar contenido', 'Actualiser le contenu'], ['تم تحديث المحتوى', 'Content refreshed', 'Contenido actualizado', 'Contenu actualisé'], ['القنوات التجريبية', 'Demo channels', 'Canales de prueba', 'Chaînes de démo'],
    ['مسح كل البيانات', 'Erase all data', 'Borrar todos los datos', 'Effacer toutes les données'], ['تم مسح كل البيانات', 'All data erased', 'Datos borrados', 'Données effacées'], ['تم مسح سجل المشاهدة', 'Watch history cleared', 'Historial borrado', 'Historique effacé'],
    ['أخرى', 'Other', 'Otros', 'Autres'], ['تم تحميل المحتوى التجريبي', 'Demo content loaded', 'Contenido de prueba cargado', 'Contenu de démo chargé'],
    ['التطبيق مشغّل فقط ولا يوفّر أي قنوات. استخدم قوائم من مزوّد مرخّص أو اشتراك نظامي.', 'This app is only a player and provides no channels. Use playlists from a licensed provider.', 'Esta app es solo un reproductor y no ofrece canales. Usa listas de un proveedor con licencia.', "Cette application n'est qu'un lecteur et ne fournit aucune chaîne. Utilisez une liste d'un fournisseur autorisé."],
    ['التنقل: الأسهم للتحرك · OK للاختيار · رجوع للخلف ·', 'Navigation: arrows to move · OK to select · Back to go back ·', 'Navegación: flechas para moverte · OK para elegir · Atrás para volver ·', 'Navigation : flèches pour bouger · OK pour choisir · Retour pour revenir ·'],
    ['لإضافة قناة للمفضلة · أثناء المشاهدة: ◀▶ ترجيع/تقديم (اضغط عدة مرات لقفزات أكبر) · ▲▼ أو CH+/CH− لتغيير القناة · OK إيقاف/تشغيل · الأرقام للانتقال لقناة برقمها.', 'to add to favourites · While watching: ◀▶ rewind/forward (press repeatedly for bigger jumps) · ▲▼ or CH+/CH− to change channel · OK pause/play · numbers to jump to a channel.', 'para añadir a favoritos · Mientras ves: ◀▶ retroceder/avanzar (pulsa varias veces para saltos mayores) · ▲▼ o CH+/CH− para cambiar de canal · OK pausa · números para ir a un canal.', 'pour ajouter aux favoris · Pendant la lecture : ◀▶ reculer/avancer (plusieurs fois pour aller plus loin) · ▲▼ ou CH+/CH− pour changer de chaîne · OK pause · chiffres pour aller à une chaîne.'],
    // loading / errors
    ['جارِ تحميل الفئات…', 'Loading categories…', 'Cargando categorías…', 'Chargement des catégories…'], ['جارِ تحميل المحتوى…', 'Loading content…', 'Cargando contenido…', 'Chargement du contenu…'],
    ['جارِ تسجيل الدخول…', 'Signing in…', 'Iniciando sesión…', 'Connexion…'], ['تم تسجيل الدخول', 'Signed in', 'Sesión iniciada', 'Connecté'], ['تعذّر الدخول:', 'Sign-in failed:', 'Error al iniciar sesión:', 'Échec de connexion :'],
    ['اسم المستخدم أو كلمة المرور غير صحيحة', 'Wrong username or password', 'Usuario o contraseña incorrectos', 'Identifiant ou mot de passe incorrect'], ['أكمل بيانات السيرفر واسم المستخدم وكلمة المرور', 'Fill in server, username and password', 'Completa servidor, usuario y contraseña', 'Renseignez serveur, identifiant et mot de passe'],
    ['أدخل رابط القائمة أولاً', 'Enter the playlist link first', 'Introduce primero el enlace', "Saisissez d'abord le lien"], ['القائمة فارغة أو غير صالحة', 'Playlist is empty or invalid', 'Lista vacía o no válida', 'Liste vide ou invalide'],
    ['تعذّر تحميل القائمة:', 'Could not load playlist:', 'No se pudo cargar la lista:', 'Impossible de charger la liste :'], ['تعذّر تحميل الفئات من السيرفر', 'Could not load categories from the server', 'No se pudieron cargar las categorías', 'Impossible de charger les catégories'],
    ['تعذّر تحميل', 'Could not load', 'No se pudo cargar', 'Impossible de charger'], ['تم تحميل', 'Loaded', 'Cargado', 'Chargé'], ['خطأ في الشبكة', 'Network error', 'Error de red', 'Erreur réseau'], ['انتهت المهلة', 'Timed out', 'Tiempo agotado', 'Délai dépassé'],
    ['رد غير متوقع من السيرفر', 'Unexpected server response', 'Respuesta inesperada del servidor', 'Réponse inattendue du serveur'], ['ملف مضغوط غير مدعوم', 'Unsupported compressed file', 'Archivo comprimido no compatible', 'Fichier compressé non pris en charge'],
    ['اضغط رجوع مرة أخرى للخروج', 'Press Back again to exit', 'Pulsa Atrás otra vez para salir', 'Appuyez encore sur Retour pour quitter'], ['تم', 'Done', 'Hecho', 'OK'], ['ابدأ', 'Start', 'Empezar', 'Démarrer'], ['تعديل', 'Edit', 'Editar', 'Modifier'],
    ['إيقاف', 'Stop', 'Detener', 'Arrêter'], ['مسح', 'Clear', 'Borrar', 'Effacer'], ['قائمة', 'Playlist', 'Lista', 'Liste'], ['خطأ', 'error', 'error', 'erreur'], ['تلقائي', 'auto', 'automático', 'auto'],
    ['تمام ✓ — ترجمة الواجهة لـ', 'Done ✓ —', 'Hecho ✓ —', 'OK ✓ —'], ['جاية بالتحديث الجاي', '', '', ''],
    ['التفاصيل', 'Details', 'Detalles', 'Détails'],
    ['رح تنحذف قائمته وسجل مشاهدته ومفضلته', 'Their list, history and favourites will be deleted', 'Se borrarán su lista, historial y favoritos', 'Sa liste, son historique et ses favoris seront supprimés'],
    ['حذف ملف', 'Delete profile', 'Eliminar perfil', 'Supprimer le profil'],
    ['صوت بداية التطبيق:', 'Startup sound:', 'Sonido de inicio:', 'Son de démarrage :'], ['صوت بداية التطبيق', 'Startup sound', 'Sonido de inicio', 'Son de démarrage'],
    ['الرابط: …', 'Link: …', 'Enlace: …', 'Lien : …'], ['م', 'S', 'T', 'S']
  ];
  var IDX = { en: 1, es: 2, fr: 3 }, lang = 'ar', exact = {}, frag = null, fragMap = {}, obs = null;
  var AR = /[؀-ۿ]/;
  var SKIP = '.hi-title,.hi-desc,.sn-who b,.card-name,.poster-fallback,.hero-title,.hero-group,.info-title,.info-plot,.hero-desc,.hero-now,.pbg-title,.pbg-meta,.g-ch,.g-prog,.group-item,.lk-chip,.osd-name,.osd-now,.osd-next,.info-people,.rail-title,.lp-info,.pl-info,.prof-name,.ep-panel .t,.head-row h2,.kind-head,input,textarea';

  function build() {
    exact = {}; fragMap = {}; var keys = [];
    if (lang === 'ar') { frag = null; return; }
    var i = IDX[lang];
    W.forEach(function (r) {
      exact[r[0]] = r[i];
      if (r[0].length > 1) { fragMap[r[0]] = r[i]; keys.push(r[0]); }
      var k2 = Glyphs.strip(r[0]);                     // same phrase after its symbol became an icon
      if (k2 && k2 !== r[0] && !exact.hasOwnProperty(k2)) { exact[k2] = Glyphs.strip(r[i]); if (k2.length > 1) { fragMap[k2] = exact[k2]; keys.push(k2); } }
    });
    keys.sort(function (a, b) { return b.length - a.length; });
    var alt = keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    frag = new RegExp('(^|[^\\u0600-\\u06FF])(' + alt + ')(?![\\u0600-\\u06FF])', 'g');
  }
  function skipped(el) {                       // the text's own element, or a bare span/b/em inside it
    if (!el || el.nodeType !== 1) return false;
    var m = el.matches || el.webkitMatchesSelector;
    if (m.call(el, SKIP)) return true;
    var p = el.parentNode;
    return /^(SPAN|B|EM|I)$/.test(el.tagName) && !el.className && p && p.nodeType === 1 && m.call(p, SKIP);
  }
  var UNITS = { 'فيلم': ['movies', 'películas', 'films'], 'مسلسل': ['series', 'series', 'séries'], 'قناة': ['channels', 'canales', 'chaînes'], 'حلقة': ['episodes', 'episodios', 'épisodes'], 'مواسم': ['seasons', 'temporadas', 'saisons'] };
  function tr(s, contentOnly) {
    var t = s.trim();
    if (exact.hasOwnProperty(t)) return s.replace(t, exact[t]);
    if (contentOnly) return s;
    var li = IDX[lang] - 1;
    var out = s.replace(/(\d+)\s*(فيلم|مسلسل|قناة|حلقة|مواسم)(?![\u0600-\u06FF])/g, function (m0, n, u) { return n + ' ' + UNITS[u][li]; });
    out = out.replace(frag, function (m0, pre, k) { return pre + fragMap[k]; });
    out = out.replace(/(^|[^؀-ۿ])م(\d+)(?=[^؀-ۿ]|$)/g, '$1' + exact['م'] + '$2')
             .replace(/(\d+)\s*س(?![؀-ۿ])/g, '$1h').replace(/(\d+)\s*د(?![؀-ۿ])/g, '$1m').replace(/(\d+)\s*ث(?![؀-ۿ])/g, '$1s')
             .replace(/«/g, '“').replace(/»/g, '”').replace(/،/g, ',').replace(/؟/g, '?');
    return out;
  }
  /* every translated node remembers its Arabic original, so switching language again works without a restart */
  function doText(n) {
    var v = n.nodeValue;
    if (!v) return;
    if (v !== n._tr) { if (!AR.test(v)) return; n._ar = v; }
    if (lang === 'ar') { if (n._ar != null && v !== n._ar) { n._tr = n._ar; n.nodeValue = n._ar; } return; }
    var nv = tr(n._ar, skipped(n.parentNode));
    n._tr = nv;
    if (nv !== v) n.nodeValue = nv;
  }
  function doAttrs(el) {
    if (!el.getAttribute) return;
    var o = el._arA || (el._arA = {});
    ['placeholder', 'title'].forEach(function (a) {
      var v = el.getAttribute(a);
      if (!v) return;
      if (v !== o[a + '_t']) { if (!AR.test(v)) return; o[a] = v; }
      var nv = lang === 'ar' ? o[a] : tr(o[a], false);
      o[a + '_t'] = nv;
      if (nv !== v) el.setAttribute(a, nv);
    });
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var tw = document.createTreeWalker(root, 5, null, false), n;   // elements + text
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else if (n.hasAttribute('placeholder') || n.hasAttribute('title')) doAttrs(n); }
  }
  function setLang(l) {
    lang = IDX[l] ? l : 'ar';
    build();
    var html = document.documentElement;
    html.setAttribute('lang', lang); html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('ltr', lang !== 'ar');
    var css = document.getElementById('main-css');
    if (css) { var want = lang === 'ar' ? 'css/style.css' : 'css/style.ltr.css'; if (css.getAttribute('href') !== want) css.setAttribute('href', want); }
    if (obs) { obs.disconnect(); obs = null; }
    walk(document.body);                         // restores Arabic or re-translates from the originals
    if (lang === 'ar') return;
    obs = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
  }
  /* exact lookup for code that builds strings itself */
  function t(s) { return lang !== 'ar' && exact.hasOwnProperty(s) ? exact[s] : s; }
  return { setLang: setLang, t: t, lang: function () { return lang; }, isLtr: function () { return lang !== 'ar'; } };
})();
