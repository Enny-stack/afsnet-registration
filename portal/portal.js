const supabase = supabase.createClient(
  "https://wxzszvuokbbmbqxwmfhd.supabase.co",
  "wxzszvuokbbmbqxwmfhd"
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
