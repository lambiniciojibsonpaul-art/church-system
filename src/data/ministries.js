export const ministries = [
  {
    name: "Shrine Ministry",
    icon: "⛪",
    description: "Dedicated to the upkeep, promotion, and spiritual administration of the minor basilica as a place of pilgrimage."
  },
  {
    name: "Worship Ministry",
    icon: "🙌",
    description: "Coordinates all liturgical celebrations and ensures the solemnity and order of parish worship."
  },
  {
    name: "Extraordinary Ministers of Holy Communion",
    icon: "🍞",
    description: "Assists the priest in the distribution of the Holy Eucharist during Mass and to the sick and homebound."
  },
  {
    name: "Music Ministry",
    icon: "🎵",
    description: "Leads the congregation in worship through hymns and sacred music during liturgical celebrations."
  },
  {
    name: "Ministry of Lectors and Commentators",
    icon: "📖",
    description: "Proclaims the Word of God and guides the congregation through the liturgical responses during the Mass."
  },
  {
    name: "Ministry of Altar Servers",
    icon: "🕯️",
    description: "Assists the priest at the altar, demonstrating reverence and dedication during liturgical services."
  },
  {
    name: "Greeters and Collectors",
    icon: "🤝",
    description: "Welcomes parishioners to the church and assists in the orderly gathering of offerings during the Mass."
  },
  {
    name: "Mother Butler Guild",
    icon: "🌸",
    description: "Dedicated to the preparation of the altar, taking care of sacred vessels, and maintaining liturgical linens."
  },
  {
    name: "Bereavement Ministry",
    icon: "🕊️",
    description: "Provides spiritual support, comfort, and assistance to families grieving the loss of a loved one."
  },
  {
    name: "Education and Formation Ministry",
    icon: "📚",
    description: "Focuses on the continuous spiritual education and faith formation of the parish community."
  },
  {
    name: "Catechetical Ministry",
    icon: "✝️",
    description: "Teaches the foundations of the Catholic faith, preparing individuals for the reception of the Sacraments."
  },
  {
    name: "Vocation Ministry",
    icon: "🙏",
    description: "Promotes and prays for vocations to the priesthood, religious life, and consecrated lay life."
  },
  {
    name: "Synod Animator",
    icon: "🚶",
    description: "Facilitates community dialogue and journeying together in alignment with the synodal vision of the Church."
  },
  {
    name: "Mission Ministry",
    icon: "🌍",
    description: "Promotes the missionary spirit within the parish, supporting both local and global evangelization efforts."
  },
  {
    name: "Pastoral Care for LGBTQIA",
    icon: "❤️",
    description: "Provides a welcoming, compassionate, and spiritually supportive environment for the LGBTQIA community."
  },
  {
    name: "Social Services and Development Ministry",
    icon: "🤲",
    description: "Extends the Church's charity to the poor and marginalized through outreach and relief programs."
  },
  {
    name: "Livelihood and Job Placement",
    icon: "💼",
    description: "Assists parishioners in gaining skills and finding employment to support their families with dignity."
  },
  {
    name: "Public Affairs Ministry",
    icon: "📰",
    description: "Engages with the community on civic matters, promoting Catholic social teachings in the public sphere."
  },
  {
    name: "Elderly Ministry",
    icon: "🧓",
    description: "Provides fellowship, spiritual care, and support programs for the senior members of the parish."
  },
  {
    name: "Ecology Ministry",
    icon: "🌱",
    description: "Advocates for environmental stewardship and the care of God's creation within the community."
  },
  {
    name: "DRRM",
    icon: "🛡️",
    description: "Disaster Risk Reduction and Management; prepares the parish for emergencies and coordinates relief efforts."
  },
  {
    name: "Health Ministry",
    icon: "⚕️",
    description: "Promotes physical well-being through medical missions, health education, and care for the sick."
  },
  {
    name: "JPIC and Urban Poor Ministry",
    icon: "⚖️",
    description: "Justice, Peace, and Integrity of Creation; advocates for the rights and welfare of the urban poor."
  },
  {
    name: "(ZCSD) Restorative Justice Ministry",
    icon: "🕊️",
    description: "Provides spiritual and moral support to persons deprived of liberty and advocates for restorative justice."
  },
  {
    name: "Youth Ministry",
    icon: "⭐",
    description: "Guides young people in their faith journey, fostering leadership and active participation in the Church."
  },
  {
    name: "Social Communications Ministry",
    icon: "📱",
    description: "Manages the parish's digital presence, announcements, and media to spread the Gospel online."
  },
  {
    name: "Family and Life Ministry",
    icon: "👨‍👩‍👧‍👦",
    description: "Supports family life, advocates for the sanctity of life, and provides marriage preparation and counseling."
  },
  {
    name: "Migrants Ministry",
    icon: "🧳",
    description: "Offers spiritual support and guidance for Overseas Filipino Workers (OFWs) and their families."
  },
  {
    name: "Temporalities Ministry",
    icon: "🏛️",
    description: "Manages the physical assets, facilities, and financial resources of the parish."
  },
  {
    name: "Catholic Women’s League",
    icon: "👩",
    description: "An organization of Catholic women dedicated to religious, charitable, and civic works."
  },
  {
    name: "El Shaddai",
    icon: "🙌",
    description: "A Catholic charismatic renewal movement focusing on prayer, healing, and community worship."
  },
  {
    name: "Holy Name Society",
    icon: "✝️",
    description: "Promotes reverence for the Holy Name of Jesus and encourages spiritual growth among men."
  },
  {
    name: "Women for Christ",
    icon: "🕊️",
    description: "A community of women dedicated to deepening their faith and serving the Church through prayer and action."
  },
  {
    name: "Divine Mercy Apostolate",
    icon: "❤️‍🔥",
    description: "Promotes devotion to the Divine Mercy, encouraging trust in Jesus and acts of mercy toward others."
  }
];

// This automatically creates a simple array of just the names 
// so your Admin Schedules form can easily use them in the dropdown!
export const ministryNames = ministries.map(m => m.name);