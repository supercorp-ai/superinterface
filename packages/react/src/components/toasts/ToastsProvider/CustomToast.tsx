import * as Toast from '@radix-ui/react-toast'
import {
  Card,
  Text,
  Flex,
} from '@radix-ui/themes'
import {
  CheckCircledIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons'
import { Toast as ToastType } from '@/types'

export const CustomToast = ({
  toast,
}: {
  toast: ToastType,
}) => (
  <Toast.Root>
    <Card>
      <Toast.Title>
        <Flex>
          <Flex
            pr="2"
            height="14px"
            align="center"
          >
            {toast.type === 'success' ? (
              <CheckCircledIcon
                color="var(--accent-9)"
              />
            ) : (
              <CrossCircledIcon
                color="var(--red-9)"
              />
            )}
          </Flex>
          <Text
            weight="medium"
            size="1"
          >
            {toast.message}
          </Text>
        </Flex>
      </Toast.Title>
    </Card>
  </Toast.Root>
)
