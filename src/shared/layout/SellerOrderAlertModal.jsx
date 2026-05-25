import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SellerOrderAlertModal = ({
  order,
  timeLeft,
  acceptWindowTotalRef,
  onAccept,
  onDecline,
}) => (
  <AnimatePresence>
    {order && (
      <motion.div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
        >
          <motion.div className="flex flex-col items-center text-center">
            <motion.div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <BellRing className="h-10 w-10 text-primary" />
            </motion.div>

            <h2 className="text-2xl font-black text-slate-900 mb-2">New Order Received!</h2>
            <p className="text-slate-600 font-medium mb-6">
              You have a new order{' '}
              <span className="text-primary font-bold">#{order.orderId}</span> for{' '}
              <span className="text-slate-900 font-bold">
                ₹{order.pricing?.total || order.total}
              </span>
            </p>

            <motion.div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full transition-[width] duration-1000 ease-linear',
                  timeLeft < 15 ? 'bg-rose-500' : 'bg-primary',
                )}
                style={{
                  width: `${acceptWindowTotalRef.current > 0 ? (timeLeft / acceptWindowTotalRef.current) * 100 : 0}%`,
                }}
              />
            </motion.div>

            <motion.div className="flex items-center gap-4 text-sm font-bold mb-8">
              <Clock
                className={cn('h-4 w-4', timeLeft < 15 ? 'text-rose-500 animate-pulse' : 'text-slate-600')}
              />
              <span className={timeLeft < 15 ? 'text-rose-500' : 'text-slate-600'}>
                Accept within {timeLeft} {timeLeft === 1 ? 'second' : 'seconds'}
              </span>
            </motion.div>

            <motion.div className="grid grid-cols-2 gap-4 w-full">
              <button
                type="button"
                onClick={() => onDecline(order.orderId)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
                Decline
              </button>
              <button
                type="button"
                onClick={() => onAccept(order)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                <Check className="h-5 w-5" />
                Accept
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SellerOrderAlertModal;
