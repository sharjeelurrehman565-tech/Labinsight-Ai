import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CbcAnalysis from './pages/CbcAnalysis'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cbc" element={<CbcAnalysis />} />
    </Routes>
  )
}
