module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        litopia: "#6C4AB6",  // Warna utama Litopia
        softcream: "#F7F3E9", // Background lembut
      },
      fontFamily: {
        brand: ["Merriweather", "serif"],  // Font untuk judul (heading)
        body: ["Poppins", "sans-serif"],   // Font untuk teks
      },
    },
  },
  plugins: [],
}
