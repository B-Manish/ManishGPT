// import { useState, useEffect } from "react";
// import ReactMarkdown from "react-markdown";

// function App() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSend = async () => {
//     if (!input.trim()) return;

//     const userMessage = { role: "user", content: input };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setLoading(true);

//     try {
//       const res = await fetch("http://localhost:8000/run-agent", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: input }),
//       });

//       const data = await res.json();
//       const assistantMessage = { role: "assistant", content: data.response };

//       setMessages((prev) => [...prev, assistantMessage]);
//     } catch (err) {
//       setMessages((prev) => [
//         ...prev,
//         { role: "assistant", content: "❌ Error fetching response." },
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter") handleSend();
//   };

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         height: "100vh",
//         width: "100%",
//         backgroundColor: "#1e1e20",
//         color: "white",
//         fontFamily: "Arial, sans-serif",
//       }}
//     >
//       {messages.length === 0 && (
//         <h1 style={{ textAlign: "center", marginTop: "40px", color: "#e3e3e3" }}>
//           What's on your mind today?
//         </h1>
//       )}

//       <div
//         style={{
//           flex: 1,
//           overflowY: "auto",
//           width: "100%",
//           maxWidth: "650px",
//           margin: "0 auto",
//           paddingBottom: "10px",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         {messages.map((msg, idx) => (
//           <div
//             key={idx}
//             style={{
//               marginBottom: "12px",
//               padding: "12px 16px",
//               borderRadius: "12px",
//               backgroundColor: "#343541",
//               color: "white",
//               width: "fit-content",
//               maxWidth: "90%",
//               alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
//               marginLeft: msg.role === "user" ? "auto" : undefined,
//               marginRight: msg.role === "assistant" ? "auto" : undefined,
//             }}
//           >
//             <ReactMarkdown>{msg.content}</ReactMarkdown>
//           </div>
//         ))}
//         {loading && (
//           <div
//             style={{
//               backgroundColor: "#343541",
//               color: "white",
//               borderRadius: "12px",
//               padding: "12px 16px",
//               marginBottom: "12px",
//               width: "fit-content",
//             }}
//           >
//             Typing...
//           </div>
//         )}
//       </div>

//       <div
//         style={{
//           display: "flex",
//           gap: "12px",
//           padding: "16px",
//           backgroundColor: "#40414f",
//           borderRadius: "12px",
//           width: "100%",
//           maxWidth: "650px",
//           margin: "0 auto 20px",
//         }}
//       >
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Ask anything..."
//           style={{
//             flex: 1,
//             backgroundColor: "#40414f",
//             border: "none",
//             color: "white",
//             fontSize: "16px",
//             outline: "none",
//           }}
//         />
//         <button
//           onClick={handleSend}
//           style={{
//             backgroundColor: "#40414f",
//             border: "none",
//             color: "white",
//             fontSize: "18px",
//             borderRadius: "50%",
//             width: "36px",
//             height: "36px",
//             cursor: "pointer",
//           }}
//         >
//           ➤
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;



import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

function App() {
  return (
    <Router>
      <div style={{ 
        display: "flex", 
        height: "100vh",
        backgroundColor: "#1e1e20"
      }}>
        <Sidebar />
        <div style={{ marginLeft: 250, flex: 1 }}>
          <Routes>
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="*" element={
              <div style={{ 
                padding: 20, 
                backgroundColor: "#1e1e20",
                color: "white",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px"
              }}>
                Select or create a conversation.
              </div>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
