import { useState } from 'react'
import FriendSearch from '../components/friend/FriendSearch'
import FriendList from '../components/friend/FriendList'

export default function FriendsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleFriendAdded = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <FriendSearch onFriendAdded={handleFriendAdded} />
      <FriendList refreshTrigger={refreshTrigger} />
    </div>
  )
}
