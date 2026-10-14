// Koraci vodiča kroz aplikaciju za nove korisnike.
// - screen: tab na kojem se korak prikazuje (vodič sam prebacuje tabove)
// - target: id elementa iz kojeg izlazi oblak (useTourTarget / TourTarget);
//           null = oblak u sredini ekrana
export const TOUR_STEPS = [
  {
    id: 'welcome',
    screen: 'trainingScreen',
    target: null,
    title: 'Dobro došao, Saiyane! 🔥',
    text: 'Ja sam Flying Nimbus i u nekoliko koraka provest ću te kroz Saiyan Trainer. Klikni "Dalje".',
  },
  {
    id: 'tab-training',
    screen: 'trainingScreen',
    target: 'tab-training',
    title: 'Strong Boy',
    text: 'Ovdje je tvoj trening. Za svaki dan vidiš tablicu vježbi s kilažom, serijama, ponavljanjima, RPE-om i volumenom.',
  },
  {
    id: 'add-exercise',
    screen: 'trainingScreen',
    target: 'add-exercise',
    title: 'Dodaj vježbu',
    text: 'Odaberi vježbu iz popisa ili upiši svoju, označi mišiće koje radi (prvi je glavni), pa kilažu, serije, ponavljanja i RPE.',
  },
  {
    id: 'calendar',
    screen: 'trainingScreen',
    target: 'calendar',
    title: 'Kalendar',
    text: 'Odaberi drugi dan, cijeli tjedan ili mjesec. Dugi pritisak na dan prikaže njegov tjedan. Aplikacija se uvijek vraća na današnji dan.',
  },
  {
    id: 'meal-summary',
    screen: 'mealScreen',
    target: 'meal-summary',
    title: 'Big man: prehrana',
    text: 'Gore su ukupne kalorije i proteini dana. Kad postaviš profil, ovdje piše i koliko ti fali do cilja.',
  },
  {
    id: 'add-meal',
    screen: 'mealScreen',
    target: 'add-meal',
    title: 'Dodaj obrok',
    text: 'Upiši namirnicu (npr. "riža") i grame: kalorije, proteini, masti i ugljikohidrati izračunaju se sami.',
  },
  {
    id: 'body',
    screen: 'muscleScreen',
    target: 'body-figure',
    title: 'Muscle Groups',
    text: 'Tijelo pokazuje ovaj tjedan: crveno nije trenirano, žuto jednom, zeleno 2× ili više. Dodirni mišić za popis vježbi.',
  },
  {
    id: 'generate',
    screen: 'muscleScreen',
    target: 'generate',
    title: 'Generiraj trening',
    text: 'Ne znaš što danas? Ovaj gumb složi trening za crvene mišiće, a ako stane i za žute.',
  },
  {
    id: 'avatar',
    screen: 'muscleScreen',
    target: 'header-avatar',
    title: 'Tvoj profil',
    text: 'Klikom na glavu Saiyana otvaraš profil. Tamo biraš i svog avatara.',
  },
  {
    id: 'profile',
    screen: 'profileScreen',
    target: 'profile-sliders',
    title: 'Profil i ciljevi',
    text: 'Povuci kettlebell za visinu i težinu, odaberi godine, aktivnost i cilj, pa klikni "Spremi profil". Aplikacija izračuna tvoje dnevne kalorije i proteine.',
  },
  {
    id: 'search',
    screen: 'profileScreen',
    target: 'profile-user',
    title: 'Saiyan name i pretraga',
    text: 'Povećalo pored imena traži druge Saiyane i njihovu tjednu statistiku. Prekidačem ispod biraš jesi li i ti vidljiv.',
  },
  {
    id: 'done',
    screen: 'trainingScreen',
    target: null,
    title: 'Spreman si! 🔥',
    text: 'Svaki ponedjeljak na Strong Boy čeka te tjedni izvještaj, a ikonom pored datuma dan treninga ili prehrane dijeliš na Instagram ili WhatsApp. Power level raste!',
  },
];
