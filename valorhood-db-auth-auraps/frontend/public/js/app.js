document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Valortown</h1>
      <button id="test-btn">Test Connection</button>
      <div id="message" class="message"></div>
    `;

    document.getElementById('test-btn').addEventListener('click', testConnection);

    async function testConnection() {
      try {
        const messageEl = document.getElementById('message');
        messageEl.textContent = "Testing connection...";

        const { data, error } = await supabase
          .from('test_table')
          .select('*')
          .limit(1);

        messageEl.textContent = error
          ? `Error: ${error.message}`
          : `Success! Found ${data.length} records`;
        messageEl.style.color = error ? 'red' : 'green';

      } catch (e) {
        console.error("Connection failed:", e);
        document.getElementById('message').textContent = `Critical error: ${e.message}`;
      }
    }
});
