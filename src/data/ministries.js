// Single source of truth for the parish ministry list.
// Consumed by MinistriesPage (display) and the admin create-event forms
// (dropdown of which ministry will host an event).

export const ministries = [
  {
    name: "Shrine Ministry",
    description:
      "Dedicated to the preservation and spiritual upkeep of the sanctuary, ensuring the shrine remains a place of peace and prayer.",
    icon: "🏛️",
  },
  {
    name: "Worship Ministry",
    description:
      "Coordinating the liturgical celebrations to ensure every mass and service is conducted with reverence and grace.",
    icon: "🙏",
  },
  {
    name: "Extraordinary Ministers of Holy Communion",
    description:
      "Serving the community by distributing the Holy Eucharist during mass and bringing communion to the sick and elderly.",
    icon: "🍞",
  },
  {
    name: "Music Ministry",
    description:
      "Enhancing the spiritual experience through sacred music, choir, and instrumental praise that uplifts the soul.",
    icon: "🎶",
  },
  {
    name: "Ministry of Lectors and Commentators",
    description:
      "Proclaiming the Word of God with clarity and devotion, guiding the congregation through the liturgical flow.",
    icon: "📖",
  },
  {
    name: "Ministry of Altar Servers",
    description:
      "Assisting the priests during the Holy Sacrifice of the Mass with discipline, dignity, and a heart for service.",
    icon: "🕯️",
  },
  {
    name: "Greeters and Collectors",
    description:
      "The first welcoming smile of the church, ensuring guests feel at home and managing the parish offerings with integrity.",
    icon: "🤝",
  },
  {
    name: "Mother Butler Guild",
    description:
      "The devoted guardians of the altar linens and vestments, maintaining the purity and beauty of the sacred vessels.",
    icon: "✨",
  },
  {
    name: "Bereavement Ministry",
    description:
      "Providing compassionate support, prayer, and presence to families during their time of loss and mourning.",
    icon: "🤍",
  },
];

// Just the names — convenient for dropdowns.
export const ministryNames = ministries.map((m) => m.name);
