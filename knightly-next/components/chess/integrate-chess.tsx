import React from 'react'
import { Button } from '../ui/button'
import { AnimatedModal } from '../ui/animated-modal'
import { Bell } from 'lucide-react'
import UsernameForm from './username-input'
import LichessOauth from '../auth/lichess-oauth'

type Props = {}

const IntegrateChess = (props: Props) => {
  return (
    <div className="flex items-center justify-around">
         <AnimatedModal 
          trigger={<>Chess.com</>}
          title="Connect Your Chess.com Account"
          className="bg-green-500 hover:bg-green-600 hover:cursor-pointer"
        >
          <div className="space-y-4 w-full">
              <UsernameForm />
            
            {/* <div className="pt-2 flex justify-end">
              <button 
                type="button" 
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-green-600 bg-transparent border border-green-600 rounded-md hover:bg-indigo-50"
              >
                View All
              </button>
            </div> */}
          </div>
        </AnimatedModal>
        <LichessOauth />
        {/* <AnimatedModal 
          trigger={<>Lichess</>}
          title="Connect Your Lichess Account"
          className="hover:cursor-pointer bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <Bell size={18} className="text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium">New feature available</p>
                <p className="text-sm text-gray-600">Check out the new dashboard view. Pages now load faster.</p>
                <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <Bell size={18} className="text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium">Your subscription expires soon</p>
                <p className="text-sm text-gray-600">Renew now to avoid interruption in service.</p>
                <p className="text-xs text-gray-500 mt-1">2 days ago</p>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button 
                type="button" 
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-indigo-600 bg-transparent border border-indigo-600 rounded-md hover:bg-indigo-50"
              >
                View All
              </button>
            </div>
          </div>
        </AnimatedModal> */}
    </div>
  )
}

export default IntegrateChess