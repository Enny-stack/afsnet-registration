const supabase = supabase.createClient(
  "https://wtjsgzlyzgfbqpptgpap.supabase.co",
  "sb_publishable_HlLHWAB1NQC8TxMcw09eHQ_D6q7EcUw"
)

async function login() {

  const email = document.getElementById("email").value

  const { error } = await supabase.auth.signInWithOtp({
    email: email
  })

  if(error){
    alert(error.message)
  } else {
    alert("Check your email for login link")
  }

}
