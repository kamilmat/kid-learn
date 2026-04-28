import { Navigate, Route, Routes } from 'react-router-dom'

export function ReadingModule() {
  return (
    <Routes>
      <Route index element={<div data-testid="reading-placeholder">Reading module — coming soon</div>} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  )
}

export default ReadingModule
