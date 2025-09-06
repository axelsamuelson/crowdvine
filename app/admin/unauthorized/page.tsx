import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You don't have permission to access this area
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Unauthorized Access</CardTitle>
            <CardDescription>
              You need admin privileges to access this section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              If you believe you should have access to this area, please contact
              your administrator.
            </p>

            <div className="flex space-x-4">
              <Link href="/admin/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
